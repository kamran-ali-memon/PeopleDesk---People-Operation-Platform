const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/leaveController");

const router = express.Router();

router.get(
  "/leaves/balance",
  protect,
  allowRoles("employee"),
  wrap(controller.leaveBalance),
);
router.get("/leaves", protect, wrap(controller.listLeaves));
router.post(
  "/leaves",
  protect,
  allowRoles("employee"),
  wrap(controller.createLeave),
);
router.patch(
  "/leaves/:id/cancel",
  protect,
  allowRoles("employee"),
  wrap(controller.cancelLeave),
);
router.patch(
  "/leaves/:id/review",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.reviewLeave),
);

module.exports = router;
