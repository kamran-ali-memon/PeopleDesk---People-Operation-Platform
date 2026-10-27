const { LeaveType, Leave, Holiday, Settings, User } = require("../models");
const { audit, notifyUser } = require("../services/audit");
const { dateKey, workingDaysBetween } = require("../utils/dates");
const { currentEmployee, fail } = require("./controllerHelpers");

exports.leaveBalance = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee) return fail(res, 400, "Employee profile not found.");
  const types = await LeaveType.find();
  const year = new Date().getFullYear();
  const approved = await Leave.find({
    employee: employee._id,
    status: "approved",
    startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
  });
  const balances = types.map((type) => {
    const used = approved
      .filter((item) => item.type.toLowerCase() === type.name.toLowerCase())
      .reduce((sum, item) => sum + item.workingDays, 0);
    return {
      name: type.name,
      quota: type.paid ? type.quota : null,
      used,
      remaining: type.paid ? Math.max(0, type.quota - used) : null,
    };
  });
  res.json({ balances });
};
exports.listLeaves = async (req, res) => {
  const filter = {};
  if (req.user.role === "employee")
    filter.employee = req.user.employeeId || null;
  if (req.query.status) filter.status = req.query.status;
  const leaves = await Leave.find(filter)
    .populate("employee", "name employeeCode department")
    .populate("reviewer", "name")
    .sort("-createdAt")
    .limit(500);
  res.json({ leaves });
};
exports.createLeave = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee) return fail(res, 400, "Employee profile not found.");
  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate || !reason?.trim())
    return fail(
      res,
      422,
      "Leave type, start date, end date and reason are required.",
    );
  if (startDate > endDate)
    return fail(res, 422, "End date must be on or after the start date.");
  const settings = (await Settings.findOne()) || {};
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
  }).distinct("date");
  const days = workingDaysBetween(
    startDate,
    endDate,
    settings.weekendDays || [0, 6],
    holidays,
  );
  if (days < 1)
    return fail(res, 422, "The selected dates contain no working days.");
  const overlap = await Leave.findOne({
    employee: employee._id,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlap)
    return fail(res, 422, "This request overlaps an existing leave request.");
  const leaveType = await LeaveType.findOne({
    name: new RegExp(`^${type}$`, "i"),
  });
  if (!leaveType) return fail(res, 422, "Choose a valid leave type.");
  const approved = await Leave.find({
    employee: employee._id,
    type: new RegExp(`^${type}$`, "i"),
    status: "approved",
  });
  const used = approved.reduce((sum, item) => sum + item.workingDays, 0);
  if (leaveType.paid && used + days > leaveType.quota)
    return fail(
      res,
      422,
      `Not enough ${type} leave balance. Remaining: ${Math.max(0, leaveType.quota - used)} day(s).`,
    );
  const leave = await Leave.create({
    employee: employee._id,
    type: leaveType.name,
    startDate,
    endDate,
    reason: reason.trim(),
    workingDays: days,
  });
  await audit(req, "leave.created", "Leave", leave._id, null, leave.toObject());
  res
    .status(201)
    .json({ leave, message: "Leave request submitted for approval." });
};
exports.cancelLeave = async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return fail(res, 404, "Leave request not found.");
  if (
    req.user.role === "employee" &&
    String(leave.employee) !== String(req.user.employeeId)
  )
    return fail(res, 403, "You can only cancel your own leave.");
  if (leave.status !== "pending")
    return fail(res, 409, "Only pending leave requests can be cancelled.");
  leave.status = "cancelled";
  await leave.save();
  await audit(req, "leave.cancelled", "Leave", leave._id);
  res.json({ leave });
};
exports.reviewLeave = async (req, res) => {
  const leave = await Leave.findById(req.params.id).populate("employee");
  if (!leave) return fail(res, 404, "Leave request not found.");
  const isAdminOverride =
    req.user.role === "admin" &&
    leave.status === "rejected" &&
    req.body.approve === true;
  if (leave.status !== "pending" && !isAdminOverride)
    return fail(res, 409, "This request has already been reviewed.");
  leave.status = req.body.approve ? "approved" : "rejected";
  leave.reviewer = req.user._id;
  leave.reviewComment = req.body.comment || "";
  await leave.save();
  if (leave.employee?.user)
    await notifyUser(
      leave.employee.user,
      `Leave ${leave.status}`,
      `Your ${leave.type} leave request from ${leave.startDate} to ${leave.endDate} was ${leave.status}. ${leave.reviewComment}`,
    );
  await audit(
    req,
    isAdminOverride ? "leave.admin_overridden" : `leave.${leave.status}`,
    "Leave",
    leave._id,
  );
  res.json({ leave, message: `Leave ${leave.status}.` });
};
