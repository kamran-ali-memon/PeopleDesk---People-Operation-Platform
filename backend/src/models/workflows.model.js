const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const expenseSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: ["travel", "equipment", "internet", "maintenance", "other"], required: true },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, default: "", maxlength: 2000 },
    receiptData: { type: String, default: "", select: false },
    status: { type: String, enum: ["submitted", "verified", "approved", "rejected"], default: "submitted" },
    hrReviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminReviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewComment: { type: String, default: "" },
  },
  { timestamps: true },
);
expenseSchema.index({ companyId: 1, employee: 1, createdAt: -1 });
expenseSchema.index({ companyId: 1, status: 1, createdAt: -1 });

const reviewCycleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
reviewCycleSchema.index({ companyId: 1, name: 1 }, { unique: true });
reviewCycleSchema.index({ companyId: 1, status: 1 });

const performanceReviewSchema = new Schema(
  {
    cycle: { type: Schema.Types.ObjectId, ref: "ReviewCycle", required: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    selfAppraisal: { type: String, required: true, maxlength: 5000 },
    goals: { type: String, default: "", maxlength: 3000 },
    status: { type: String, enum: ["submitted", "hr_reviewed", "finalized"], default: "submitted" },
    hrReviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    hrRating: { type: Number, min: 1, max: 5, default: null },
    hrComment: { type: String, default: "", maxlength: 2000 },
    finalReviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finalRating: { type: Number, min: 1, max: 5, default: null },
    finalComment: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true },
);
performanceReviewSchema.index({ companyId: 1, employee: 1, cycle: 1 }, { unique: true });
performanceReviewSchema.index({ companyId: 1, status: 1, createdAt: -1 });

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  ExpenseClaim: model("ExpenseClaim", expenseSchema),
  ReviewCycle: model("ReviewCycle", reviewCycleSchema),
  PerformanceReview: model("PerformanceReview", performanceReviewSchema),
};
