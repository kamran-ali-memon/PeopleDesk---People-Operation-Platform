const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const leaveSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    type: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    workingDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewComment: { type: String, default: "" },
  },
  { timestamps: true },
);

leaveSchema.index({ companyId: 1, employee: 1, status: 1, startDate: 1 });
leaveSchema.index({ companyId: 1, status: 1, createdAt: -1 });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = { Leave: model("Leave", leaveSchema) };
