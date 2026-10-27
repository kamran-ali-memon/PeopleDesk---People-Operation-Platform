const {
  Settings,
  Department,
  Designation,
  LeaveType,
  Holiday,
  Company,
} = require("../models");
const { audit } = require("../services/audit");
const { fail } = require("./controllerHelpers");
const { validLogoData } = require("../utils/branding");

exports.getSettings = async (req, res) => {
  const isEmployee = req.user.role === "employee";
  const isAdmin = req.user.role === "admin";
  res.json({
    company: req.company
      ? { id: req.company._id, name: req.company.name, slug: req.company.slug, logoData: req.company.logoData || "" }
      : null,
    settings: isAdmin ? await Settings.findOne() : null,
    departments: isEmployee ? [] : await Department.find().sort("name"),
    designations: isEmployee
      ? []
      : await Designation.find().populate("department", "name"),
    leaveTypes: await LeaveType.find().sort("name"),
    holidays: isEmployee ? [] : await Holiday.find().sort("date"),
  });
};
exports.updateSettings = async (req, res) => {
  const allowed = [
    "companyName",
    "officeStart",
    "graceMinutes",
    "halfDayHours",
    "weekendDays",
    "officeLatitude",
    "officeLongitude",
    "officeRadius",
  ];
  if (req.body.logoData !== undefined && !validLogoData(req.body.logoData))
    return fail(res, 422, "Use a PNG, JPEG, or WebP logo image smaller than 1 MB.");
  const settings = (await Settings.findOne()) || new Settings({ companyId: req.companyId });
  const before = settings.toObject();
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  });
  await settings.save();
  if (req.body.companyName !== undefined || req.body.logoData !== undefined) {
    if (typeof req.body.companyName === "string" && req.body.companyName.trim())
      req.company.name = req.body.companyName.trim();
    if (req.body.logoData !== undefined) req.company.logoData = req.body.logoData;
    await req.company.save();
  }
  await audit(
    req,
    "settings.updated",
    "Settings",
    settings._id,
    before,
    settings.toObject(),
  );
  res.json({ settings });
};
exports.createDepartment = async (req, res) => {
  if (!req.body.name?.trim())
    return fail(res, 422, "Department name is required.");
  try {
    const item = await Department.create({
      name: req.body.name.trim(),
      description: req.body.description || "",
    });
    await audit(
      req,
      "department.created",
      "Department",
      item._id,
      null,
      item.toObject(),
    );
    res.status(201).json({ item });
  } catch (error) {
    if (error.code === 11000)
      return fail(res, 409, "That department already exists.");
    throw error;
  }
};
exports.createDesignation = async (req, res) => {
  if (!req.body.name?.trim())
    return fail(res, 422, "Designation name is required.");
  if (req.body.department && !(await Department.exists({ _id: req.body.department })))
    return fail(res, 422, "Choose a department in this company.");
  const item = await Designation.create({
    name: req.body.name.trim(),
    department: req.body.department || null,
  });
  await audit(
    req,
    "designation.created",
    "Designation",
    item._id,
    null,
    item.toObject(),
  );
  res.status(201).json({ item });
};
exports.createLeaveType = async (req, res) => {
  if (!req.body.name?.trim())
    return fail(res, 422, "Leave type name is required.");
  const item = await LeaveType.create({
    name: req.body.name.trim(),
    quota: Math.max(0, Number(req.body.quota || 0)),
    paid: req.body.paid !== false,
  });
  await audit(
    req,
    "leave_type.created",
    "LeaveType",
    item._id,
    null,
    item.toObject(),
  );
  res.status(201).json({ item });
};
exports.createHoliday = async (req, res) => {
  if (!req.body.name || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.date || ""))
    return fail(res, 422, "Holiday name and date are required.");
  const item = await Holiday.create({
    name: req.body.name,
    date: req.body.date,
    description: req.body.description || "",
  });
  await audit(
    req,
    "holiday.created",
    "Holiday",
    item._id,
    null,
    item.toObject(),
  );
  res.status(201).json({ item });
};
