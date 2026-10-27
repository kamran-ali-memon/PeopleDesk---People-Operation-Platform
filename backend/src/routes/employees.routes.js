const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/employeeController");

const router = express.Router();

router.get(
  "/employees/export",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.exportEmployees),
);
router.post(
  "/employees/import/dry-run",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.dryRunEmployeeImport),
);
router.post(
  "/employees/import",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.importEmployees),
);
router.get("/employees", protect, wrap(controller.listEmployees));
router.post(
  "/employees",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.createEmployee),
);
router.patch(
  "/employees/:id",
  protect,
  allowRoles("admin", "hr", "employee"),
  wrap(controller.updateEmployee),
);

module.exports = router;
