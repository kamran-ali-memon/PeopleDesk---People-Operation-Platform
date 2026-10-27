const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/payrollController");

const router = express.Router();

router.get("/payroll", protect, wrap(controller.payrollList));
router.post(
  "/payroll/run",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.runPayroll),
);
router.patch(
  "/payroll/:id",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.updateDraftPayroll),
);
router.post(
  "/payroll/:month/finalize",
  protect,
  allowRoles("admin"),
  wrap(controller.finalizePayroll),
);
router.get("/payroll/:id/payslip", protect, wrap(controller.downloadPayslip));

module.exports = router;
