const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const attendanceSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: {
      type: String,
      enum: [
        "present",
        "late",
        "half_day",
        "missing_checkout",
        "absent",
        "on_leave",
      ],
      default: "present",
    },
    correctionStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    correctionReason: { type: String, default: "" },
    correctionComment: { type: String, default: "" },
  },
  { timestamps: true },
);
attendanceSchema.index({ companyId: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1 });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = { Attendance: model("Attendance", attendanceSchema) };
