const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const payrollSchema = new Schema(
  {
    month: { type: String, required: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    basic: Number,
    hra: Number,
    medical: Number,
    gross: Number,
    absentDays: Number,
    unpaidDays: Number,
    halfDays: Number,
    deductions: Number,
    tax: Number,
    net: Number,
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
    finalizedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finalizedAt: Date,
  },
  { timestamps: true },
);
payrollSchema.index({ companyId: 1, month: 1, employee: 1 }, { unique: true });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = { Payroll: model("Payroll", payrollSchema) };
