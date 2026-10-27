const { AuditLog, Notification } = require("../models");

async function audit(
  req,
  action,
  entity,
  entityId = "",
  before = null,
  after = null,
) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorName: req.user?.name || "System",
      action,
      entity,
      entityId: String(entityId || ""),
      before,
      after,
      ip: req.ip,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}

async function notifyUser(userId, title, message, link = "") {
  if (!userId) return;
  await Notification.create({ user: userId, title, message, link });
}
module.exports = { audit, notifyUser };
