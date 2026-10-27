const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/workflowsController");

const router = express.Router();
router.get("/expenses", protect, wrap(controller.listExpenses));
router.post("/expenses", protect, allowRoles("employee"), wrap(controller.createExpense));
router.get("/expenses/:id/receipt", protect, wrap(controller.getExpenseReceipt));
router.patch("/expenses/:id/hr-review", protect, allowRoles("hr"), wrap(controller.reviewExpense));
router.patch("/expenses/:id/finalize", protect, allowRoles("admin"), wrap(controller.finalizeExpense));

router.get("/performance/reviews", protect, wrap(controller.listPerformance));
router.post("/performance/cycles", protect, allowRoles("hr"), wrap(controller.createReviewCycle));
router.patch("/performance/cycles/:id/close", protect, allowRoles("hr"), wrap(controller.closeReviewCycle));
router.post("/performance/reviews", protect, allowRoles("employee"), wrap(controller.submitSelfAppraisal));
router.patch("/performance/reviews/:id/hr-review", protect, allowRoles("hr"), wrap(controller.hrReviewPerformance));
router.patch("/performance/reviews/:id/finalize", protect, allowRoles("admin"), wrap(controller.finalizePerformance));
module.exports = router;
