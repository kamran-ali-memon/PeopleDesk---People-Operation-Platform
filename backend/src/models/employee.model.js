const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const employeeSchema = new Schema(
  {
    employeeCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    emergencyContactName: { type: String, default: "", maxlength: 120 },
    emergencyContactPhone: { type: String, default: "", maxlength: 40 },
    emergencyContactRelationship: { type: String, default: "", maxlength: 60 },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    designation: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    joinDate: { type: Date, default: Date.now },
    employmentStatus: {
      type: String,
      enum: ["active", "probation", "exited"],
      default: "active",
    },
    basicSalary: { type: Number, required: true, min: 1 },
    allowances: { type: Number, default: 0 },
    gender: { type: String, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, name: 1 });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = { Employee: model("Employee", employeeSchema) };
