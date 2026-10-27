const { Announcement, User, Notification, AuditLog } = require("../models");
const { audit, notifyUser } = require("../services/audit");
const { fail } = require("./controllerHelpers");

exports.createAnnouncement = async (req, res) => {
  if (!req.body.title?.trim() || !req.body.message?.trim())
    return fail(res, 422, "Title and message are required.");
  const audience = req.body.audience || (req.user.role === "hr" ? "employee" : "all");
  if (!["all", "hr", "employee"].includes(audience))
    return fail(res, 422, "Choose a valid announcement audience.");
  if (req.user.role === "hr" && audience === "all")
    return fail(res, 403, "HR can publish announcements to HR or Employees.");
  const item = await Announcement.create({
    title: req.body.title.trim(),
    message: req.body.message.trim(),
    author: req.user._id,
    audience,
  });
  const users = await User.find({
    active: true,
    ...(item.audience === "all" ? {} : { role: item.audience }),
  }).select("_id");
  await Promise.all(
    users.map((user) =>
      notifyUser(user._id, item.title, item.message, "/dashboard"),
    ),
  );
  await audit(
    req,
    "announcement.created",
    "Announcement",
    item._id,
    null,
    item.toObject(),
  );
  res.status(201).json({ announcement: item });
};
exports.listAnnouncements = async (req, res) =>
  res.json({
    announcements: await Announcement.find({
      $or: [{ audience: "all" }, { audience: req.user.role }],
    })
      .populate("author", "name")
      .sort("-createdAt")
      .limit(100),
  });
exports.listNotifications = async (req, res) =>
  res.json({
    notifications: await Notification.find({ user: req.user._id })
      .sort("-createdAt")
      .limit(100),
  });
exports.readNotification = async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true },
  );
  if (!item) return fail(res, 404, "Notification not found.");
  res.json({ notification: item });
};
exports.auditLogs = async (req, res) =>
  res.json({
    logs: await AuditLog.find()
      .sort("-createdAt")
      .limit(300)
      .populate("actor", "name email"),
  });

exports.updateAnnouncement = async (req, res) => {
  const item = await Announcement.findById(req.params.id);
  if (!item) return fail(res, 404, "Announcement not found.");
  const before = item.toObject();
  if (typeof req.body.title === "string" && req.body.title.trim())
    item.title = req.body.title.trim();
  if (typeof req.body.message === "string" && req.body.message.trim())
    item.message = req.body.message.trim();
  if (req.body.audience !== undefined) {
    if (!["all", "hr", "employee"].includes(req.body.audience))
      return fail(res, 422, "Choose a valid announcement audience.");
    item.audience = req.body.audience;
  }
  await item.save();
  await audit(req, "announcement.updated", "Announcement", item._id, before, item.toObject());
  res.json({ announcement: item, message: "Announcement updated." });
};

exports.deleteAnnouncement = async (req, res) => {
  const item = await Announcement.findById(req.params.id);
  if (!item) return fail(res, 404, "Announcement not found.");
  await item.deleteOne();
  await audit(req, "announcement.deleted", "Announcement", item._id, item.toObject(), null);
  res.json({ message: "Announcement deleted." });
};
