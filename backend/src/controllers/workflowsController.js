const {
  ExpenseClaim,
  PerformanceReview,
  ReviewCycle,
  Employee,
} = require("../models");
const { currentEmployee, fail } = require("./controllerHelpers");
const mongoose = require("mongoose");
const { audit, notifyUser } = require("../services/audit");

function validReceipt(value) {
  if (!value) return true;
  if (typeof value !== "string" || value.length > 1400000) return false;
  const match = value.match(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  const bytes = Buffer.from(match[3], "base64");
  if (!bytes.length || bytes.length > 1024 * 1024) return false;
  if (match[1] === "application/pdf")
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (match[2] === "png")
    return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (match[2] === "jpeg")
    return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

exports.listExpenses = async (req, res) => {
  const filter = req.user.role === "employee"
    ? { employee: req.user.employeeId || null }
    : {};
  const claims = await ExpenseClaim.find(filter)
    .select("-receiptData")
    .populate("employee", "name employeeCode user")
    .sort("-createdAt")
    .limit(300);
  res.json({ claims });
};

exports.createExpense = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee) return fail(res, 400, "Your account is not linked to an employee profile.");
  const { title, category, amount, description = "", receiptData = "" } = req.body || {};
  const numericAmount = Number(amount);
  if (!title?.trim() || !["travel", "equipment", "internet", "maintenance", "other"].includes(category) ||
      !Number.isFinite(numericAmount) || numericAmount < 1)
    return fail(res, 422, "Enter a claim title, category, and amount greater than zero.");
  if (!validReceipt(receiptData))
    return fail(res, 422, "Attach a valid PNG, JPEG, WebP, or PDF receipt smaller than 1 MB.");
  const claim = await ExpenseClaim.create({
    employee: employee._id,
    title: title.trim(),
    category,
    amount: numericAmount,
    description: String(description).trim(),
    receiptData,
  });
  await audit(req, "expense.submitted", "ExpenseClaim", claim._id);
  res.status(201).json({ claim, message: "Expense claim submitted for HR verification." });
};

exports.getExpenseReceipt = async (req, res) => {
  const claim = await ExpenseClaim.findById(req.params.id).select("+receiptData");
  if (!claim) return fail(res, 404, "Expense claim not found.");
  if (req.user.role === "employee" && String(claim.employee) !== String(req.user.employeeId))
    return fail(res, 403, "You can only view receipts for your own claims.");
  if (!claim.receiptData) return fail(res, 404, "No receipt was attached.");
  res.json({ receiptData: claim.receiptData });
};

exports.reviewExpense = async (req, res) => {
  const claim = await ExpenseClaim.findById(req.params.id).populate("employee", "user");
  if (!claim) return fail(res, 404, "Expense claim not found.");
  if (claim.status !== "submitted")
    return fail(res, 409, "Only submitted claims can be verified.");
  if (!["verified", "rejected"].includes(req.body.status))
    return fail(res, 422, "Choose verify or reject.");
  claim.status = req.body.status;
  claim.hrReviewer = req.user._id;
  claim.reviewComment = String(req.body.comment || "").trim();
  await claim.save();
  if (claim.employee?.user)
    await notifyUser(claim.employee.user, "Expense claim " + claim.status,
      claim.reviewComment || "Your expense claim was " + claim.status + ".");
  await audit(req, "expense.hr_reviewed", "ExpenseClaim", claim._id);
  res.json({ claim, message: "Claim " + claim.status + " by HR." });
};

exports.finalizeExpense = async (req, res) => {
  const claim = await ExpenseClaim.findById(req.params.id).populate("employee", "user");
  if (!claim) return fail(res, 404, "Expense claim not found.");
  if (claim.status !== "verified")
    return fail(res, 409, "Only HR-verified claims can be approved by Admin.");
  if (!["approved", "rejected"].includes(req.body.status))
    return fail(res, 422, "Choose approve or reject.");
  claim.status = req.body.status;
  claim.adminReviewer = req.user._id;
  claim.reviewComment = String(req.body.comment || "").trim();
  await claim.save();
  if (claim.employee?.user)
    await notifyUser(claim.employee.user, "Expense claim " + claim.status,
      claim.reviewComment || "Your reimbursement claim was " + claim.status + ".");
  await audit(req, "expense.admin_decided", "ExpenseClaim", claim._id);
  res.json({ claim, message: "Claim " + claim.status + " by Admin." });
};

exports.listPerformance = async (req, res) => {
  const [cycles, reviews] = await Promise.all([
    ReviewCycle.find().sort("-createdAt").limit(50),
    PerformanceReview.find(req.user.role === "employee"
      ? { employee: req.user.employeeId || null }
      : {})
      .populate("employee", "name employeeCode user")
      .populate("cycle", "name dueDate status")
      .sort("-createdAt")
      .limit(300),
  ]);
  res.json({ cycles, reviews });
};

exports.createReviewCycle = async (req, res) => {
  const { name, dueDate } = req.body || {};
  if (!name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate || ""))
    return fail(res, 422, "Enter a review cycle name and due date.");
  const cycle = await ReviewCycle.create({ name: name.trim(), dueDate, createdBy: req.user._id });
  await audit(req, "performance.cycle_created", "ReviewCycle", cycle._id);
  res.status(201).json({ cycle, message: "Review cycle created." });
};

exports.closeReviewCycle = async (req, res) => {
  const cycle = await ReviewCycle.findById(req.params.id);
  if (!cycle) return fail(res, 404, "Review cycle not found.");
  cycle.status = "closed";
  await cycle.save();
  await audit(req, "performance.cycle_closed", "ReviewCycle", cycle._id);
  res.json({ cycle, message: "Review cycle closed." });
};

exports.submitSelfAppraisal = async (req, res) => {
  const employee = await currentEmployee(req);
  if (!employee) return fail(res, 400, "Your account is not linked to an employee profile.");
  if (!mongoose.isValidObjectId(req.body?.cycleId))
    return fail(res, 422, "Choose an active review cycle.");
  const cycle = await ReviewCycle.findOne({ _id: req.body.cycleId, status: "active" });
  if (!cycle) return fail(res, 422, "Choose an active review cycle.");
  if (!req.body.selfAppraisal?.trim())
    return fail(res, 422, "Add your self-appraisal before submitting.");
  const review = await PerformanceReview.create({
    cycle: cycle._id,
    employee: employee._id,
    selfAppraisal: req.body.selfAppraisal.trim(),
    goals: String(req.body.goals || "").trim(),
  });
  await audit(req, "performance.self_appraisal_submitted", "PerformanceReview", review._id);
  res.status(201).json({ review, message: "Self-appraisal submitted to HR." });
};

exports.hrReviewPerformance = async (req, res) => {
  const review = await PerformanceReview.findById(req.params.id).populate("employee", "user");
  if (!review) return fail(res, 404, "Review not found.");
  if (review.status !== "submitted")
    return fail(res, 409, "Only submitted reviews can be reviewed by HR.");
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return fail(res, 422, "HR rating must be a whole number from 1 to 5.");
  review.hrRating = rating;
  review.hrComment = String(req.body.comment || "").trim();
  review.hrReviewer = req.user._id;
  review.status = "hr_reviewed";
  await review.save();
  if (review.employee?.user)
    await notifyUser(review.employee.user, "Performance review updated", "HR completed your review and sent it for final approval.");
  await audit(req, "performance.hr_reviewed", "PerformanceReview", review._id);
  res.json({ review, message: "HR review submitted for Admin approval." });
};

exports.finalizePerformance = async (req, res) => {
  const review = await PerformanceReview.findById(req.params.id).populate("employee", "user");
  if (!review) return fail(res, 404, "Review not found.");
  if (review.status !== "hr_reviewed")
    return fail(res, 409, "Only HR-reviewed appraisals can receive a final rating.");
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return fail(res, 422, "Final rating must be a whole number from 1 to 5.");
  review.finalRating = rating;
  review.finalComment = String(req.body.comment || "").trim();
  review.finalReviewer = req.user._id;
  review.status = "finalized";
  await review.save();
  if (review.employee?.user)
    await notifyUser(review.employee.user, "Performance review finalized", "Your final performance rating is ready.");
  await audit(req, "performance.finalized", "PerformanceReview", review._id);
  res.json({ review, message: "Final appraisal approved." });
};
