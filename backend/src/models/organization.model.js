const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
  },
  { timestamps: true },
);

departmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

const designationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
  },
  { timestamps: true },
);

designationSchema.index({ companyId: 1, name: 1, department: 1 }, { unique: true });

const leaveTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quota: { type: Number, default: 0 },
    paid: { type: Boolean, default: true },
  },
  { timestamps: true },
);

leaveTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });

const holidaySchema = new Schema(
  {
    name: { type: String, required: true },
    date: { type: String, required: true },
    description: String,
  },
  { timestamps: true },
);

const settingsSchema = new Schema(
  {
    companyName: { type: String, default: "" },
    officeStart: { type: String, default: "09:00" },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekendDays: { type: [Number], default: [0, 6] },
    officeLatitude: { type: Number, default: null },
    officeLongitude: { type: Number, default: null },
    officeRadius: { type: Number, default: 150 },
    setupComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

settingsSchema.index({ companyId: 1 }, { unique: true });
function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = {
  Department: model("Department", departmentSchema),
  Designation: model("Designation", designationSchema),
  LeaveType: model("LeaveType", leaveTypeSchema),
  Holiday: model("Holiday", holidaySchema),
  Settings: model("Settings", settingsSchema),
};
