const PDFDocument = require("pdfkit");
const { Payroll, Employee } = require("../models");
const { createPayrollDraft } = require("../services/payroll");
const { audit, notifyUser } = require("../services/audit");
const { fail } = require("./controllerHelpers");

exports.payrollList = async (req, res) => {
  const filter = {};
  if (req.user.role === "employee") {
    filter.employee = req.user.employeeId || null;
    filter.status = "finalized";
  }
  if (req.query.month) filter.month = req.query.month;
  const payrolls = await Payroll.find(filter)
    .populate("employee", "name employeeCode department")
    .sort({ month: -1, createdAt: -1 })
    .limit(500);
  res.json({ payrolls });
};
exports.runPayroll = async (req, res) => {
  const month = req.body.month;
  if (
    !/^\d{4}-\d{2}$/.test(month || "") ||
    Number(month.slice(5)) < 1 ||
    Number(month.slice(5)) > 12
  )
    return fail(res, 422, "Select a valid payroll month.");
  const existing = await Payroll.findOne({ month, status: "finalized" });
  if (existing)
    return fail(
      res,
      409,
      "This month has already been finalized and is locked.",
    );
  const payrolls = await createPayrollDraft(month);
  await audit(req, "payroll.draft_created", "Payroll", month, null, {
    count: payrolls.length,
  });
  res.json({
    payrolls,
    message: `Payroll draft prepared for ${payrolls.length} employee(s).`,
  });
};
exports.updateDraftPayroll = async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) return fail(res, 404, "Payroll draft not found.");
  if (payroll.status !== "draft")
    return fail(res, 409, "Finalized payroll cannot be edited.");
  const fields = ["basic", "hra", "medical", "deductions", "tax", "absentDays", "unpaidDays", "halfDays"];
  for (const field of fields) {
    if (req.body[field] === undefined) continue;
    const value = Number(req.body[field]);
    if (!Number.isFinite(value) || value < 0)
      return fail(res, 422, "Payroll values must be valid non-negative numbers.");
    payroll[field] = value;
  }
  payroll.gross = Number(payroll.basic || 0) + Number(payroll.hra || 0) + Number(payroll.medical || 0);
  payroll.net = Math.max(0, payroll.gross - Number(payroll.deductions || 0) - Number(payroll.tax || 0));
  await payroll.save();
  await audit(req, "payroll.draft_updated", "Payroll", payroll._id);
  res.json({ payroll, message: "Payroll draft updated." });
};

exports.finalizePayroll = async (req, res) => {
  const month = req.params.month;
  const payrolls = await Payroll.find({ month }).populate(
    "employee",
    "name user",
  );
  if (!payrolls.length)
    return fail(res, 404, "No payroll draft exists for this month.");
  if (payrolls.some((item) => item.status === "finalized"))
    return fail(res, 409, "This payroll month is already finalized.");
  await Payroll.updateMany(
    { month, status: "draft" },
    {
      $set: {
        status: "finalized",
        finalizedBy: req.user._id,
        finalizedAt: new Date(),
      },
    },
  );
  await audit(
    req,
    "payroll.finalized",
    "Payroll",
    month,
    { status: "draft" },
    { status: "finalized", count: payrolls.length },
  );
  await Promise.all(
    payrolls.map((item) =>
      notifyUser(
        item.employee?.user,
        "Payslip ready",
        `Your payslip for ${month} has been finalized and is ready to download.`,
        "/dashboard",
      ),
    ),
  );
  res.json({ message: `Payroll for ${month} finalized and locked.` });
};
exports.downloadPayslip = async (req, res) => {
  const payroll = await Payroll.findById(req.params.id).populate(
    "employee",
    "name employeeCode email",
  );
  if (!payroll) return fail(res, 404, "Payslip not found.");
  if (req.user.role === "employee") {
    if (payroll.status !== "finalized")
      return fail(res, 404, "Payslip not found.");
    if (String(payroll.employee?._id) !== String(req.user.employeeId))
      return fail(res, 403, "You can only download your own payslip.");
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="payslip-${payroll.month}.pdf"`,
  );
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(22).fillColor("#315fe0").text(req.company?.name || "PeopleDesk", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(16).fillColor("#172033").text("PAYSLIP", { align: "center" });
  doc.moveDown();
  doc.fontSize(11).text(`Employee: ${payroll.employee?.name || "Employee"}`);
  doc.text(`Employee code: ${payroll.employee?.employeeCode || "-"}`);
  doc.text(`Period: ${payroll.month}`);
  doc.text(`Status: ${payroll.status.toUpperCase()}`);
  doc.moveDown();
  const rows = [
    ["Basic salary", payroll.basic],
    ["HRA (40%)", payroll.hra],
    ["Medical allowance (10%)", payroll.medical],
    ["Gross salary", payroll.gross],
    ["Absence / leave deductions", payroll.deductions],
    ["Tax", payroll.tax],
    ["Net pay", payroll.net],
  ];
  rows.forEach(([label, value]) => {
    doc.text(label, { continued: true });
    doc.text(
      `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`,
      { align: "right" },
    );
  });
  doc.moveDown(2);
  doc
    .fontSize(9)
    .fillColor("#748096")
    .text(
      "Generated by " + (req.company?.name || "PeopleDesk") + ". Review payroll and tax values before real-world use.",
      { align: "center" },
    );
  doc.end();
};
