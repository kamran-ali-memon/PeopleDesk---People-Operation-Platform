const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    audience: { type: String, enum: ["all", "hr", "employee"], default: "all" },
  },
  { timestamps: true },
);

announcementSchema.index({ companyId: 1, audience: 1, createdAt: -1 });

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
    link: String,
  },
  { timestamps: true },
);

notificationSchema.index({ companyId: 1, user: 1, createdAt: -1 });

const auditSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    action: String,
    entity: String,
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true },
);

auditSchema.index({ companyId: 1, createdAt: -1 });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = {
  Announcement: model("Announcement", announcementSchema),
  Notification: model("Notification", notificationSchema),
  AuditLog: model("AuditLog", auditSchema),
};
