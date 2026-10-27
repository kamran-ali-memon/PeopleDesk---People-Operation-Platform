const { Attendance, Settings, Employee, Leave } = require("../models");
const { audit } = require("../services/audit");
const { dateKey } = require("../utils/dates");
const { currentEmployee, fail } = require("./controllerHelpers");

exports.checkIn = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee)
    return fail(res, 400, "This account is not linked to an employee profile.");
  const today = dateKey();
  const settings = (await Settings.findOne()) || {
    officeStart: "09:00",
    graceMinutes: 15,
  };
  if (await Attendance.exists({ employee: employee._id, date: today }))
    return fail(res, 409, "You have already checked in today.");
  const now = new Date();
  const [hour, minute] = (settings.officeStart || "09:00")
    .split(":")
    .map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(hour, minute + Number(settings.graceMinutes || 15), 0, 0);
  const status = now > cutoff ? "late" : "present";
  const record = await Attendance.create({
    employee: employee._id,
    date: today,
    checkIn: now,
    status,
  });
  await audit(
    req,
    "attendance.checked_in",
    "Attendance",
    record._id,
    null,
    record.toObject(),
  );
  res.status(201).json({
    attendance: record,
    message:
      status === "late"
        ? "Checked in. Your attendance is marked late."
        : "Check-in recorded successfully.",
  });
};
exports.checkOut = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee)
    return fail(res, 400, "This account is not linked to an employee profile.");
  const record = await Attendance.findOne({
    employee: employee._id,
    date: dateKey(),
  });
  if (!record) return fail(res, 404, "Check in before checking out.");
  if (record.checkOut)
    return fail(res, 409, "You have already checked out today.");
  record.checkOut = new Date();
  const hours = (record.checkOut - record.checkIn) / 3600000;
  const settings = await Settings.findOne();
  if (hours < Number(settings?.halfDayHours || 5)) record.status = "half_day";
  await record.save();
  await audit(
    req,
    "attendance.checked_out",
    "Attendance",
    record._id,
    null,
    record.toObject(),
  );
  res.json({
    attendance: record,
    hours: Number(hours.toFixed(2)),
    message: "Check-out recorded successfully.",
  });
};
exports.attendanceList = async (req, res) => {
  const filter = {};
  if (req.user.role === "employee")
    filter.employee = req.user.employeeId || null;
  if (req.query.date) filter.date = req.query.date;
  else if (req.query.month) {
    filter.date = {
      $gte: `${req.query.month}-01`,
      $lte: `${req.query.month}-31`,
    };
  }
  if (req.query.status) filter.status = req.query.status;
  let records = await Attendance.find(filter)
    .populate("employee", "name employeeCode department")
    .sort({ date: -1, checkIn: -1 })
    .limit(500);
  if (!req.query.date && !req.query.month) {
    const today = dateKey();
    const employeeFilter =
      req.user.role === "employee"
        ? {
            _id: req.user.employeeId || null,
            employmentStatus: { $in: ["active", "probation"] },
          }
        : { employmentStatus: { $in: ["active", "probation"] } };
    const activeEmployees = await Employee.find(employeeFilter).populate(
      "department",
      "name",
    );
    const todayRecords = await Attendance.find({ date: today }).select(
      "employee",
    );
    const recordedIds = new Set(
      todayRecords.map((item) => String(item.employee)),
    );
    const approvedLeaves = await Leave.find({
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).select("employee");
    const leaveIds = new Set(
      approvedLeaves.map((item) => String(item.employee)),
    );
    const missingEmployees = activeEmployees.filter(
      (item) =>
        !recordedIds.has(String(item._id)) && !leaveIds.has(String(item._id)),
    );
    const virtualAbsences = missingEmployees.map((item) => ({
      _id: `absent-${item._id}`,
      employee: item,
      date: today,
      checkIn: null,
      checkOut: null,
      status: "absent",
      correctionStatus: "none",
      correctionReason: "",
      virtual: true,
    }));
    records = [...virtualAbsences, ...records];
  }
  res.json({ attendance: records });
};
exports.requestCorrection = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee) return fail(res, 400, "Employee profile not found.");
  if (!req.body.date || !req.body.reason?.trim())
    return fail(res, 422, "Date and correction reason are required.");
  let record = await Attendance.findOne({
    employee: employee._id,
    date: req.body.date,
  });
  if (!record)
    record = await Attendance.create({
      employee: employee._id,
      date: req.body.date,
      status: "missing_checkout",
    });
  record.correctionStatus = "pending";
  record.correctionReason = req.body.reason.trim();
  await record.save();
  await audit(req, "attendance.correction_requested", "Attendance", record._id);
  res
    .status(201)
    .json({ attendance: record, message: "Correction request sent to HR." });
};
exports.reviewCorrection = async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) return fail(res, 404, "Attendance record not found.");
  const isAdminOverride =
    req.user.role === "admin" &&
    record.correctionStatus === "rejected" &&
    req.body.approve === true;
  if (record.correctionStatus !== "pending" && !isAdminOverride)
    return fail(res, 409, "This correction is no longer pending.");
  record.correctionStatus = req.body.approve ? "approved" : "rejected";
  record.correctionComment = req.body.comment || "";
  if (req.body.approve && req.body.checkIn)
    record.checkIn = new Date(req.body.checkIn);
  if (req.body.approve && req.body.checkOut)
    record.checkOut = new Date(req.body.checkOut);
  await record.save();
  await audit(
    req,
    isAdminOverride ? "attendance.correction_overridden" : "attendance.correction_reviewed",
    "Attendance",
    record._id,
  );
  res.json({ attendance: record });
};
