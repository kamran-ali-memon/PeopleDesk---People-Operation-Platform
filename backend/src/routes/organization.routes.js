const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/organizationController");

const router = express.Router();

router.get("/settings", protect, wrap(controller.getSettings));
router.put(
  "/settings",
  protect,
  allowRoles("admin"),
  wrap(controller.updateSettings),
);
router.post(
  "/departments",
  protect,
  allowRoles("admin"),
  wrap(controller.createDepartment),
);
router.post(
  "/designations",
  protect,
  allowRoles("admin"),
  wrap(controller.createDesignation),
);
router.post(
  "/leave-types",
  protect,
  allowRoles("admin"),
  wrap(controller.createLeaveType),
);
router.post(
  "/holidays",
  protect,
  allowRoles("admin"),
  wrap(controller.createHoliday),
);

module.exports = router;
