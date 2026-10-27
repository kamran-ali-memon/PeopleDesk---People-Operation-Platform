const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/attendanceController");

const router = express.Router();

router.post(
  "/attendance/check-in",
  protect,
  allowRoles("employee"),
  wrap(controller.checkIn),
);
router.post(
  "/attendance/check-out",
  protect,
  allowRoles("employee"),
  wrap(controller.checkOut),
);
router.get("/attendance", protect, wrap(controller.attendanceList));
router.post(
  "/attendance/corrections",
  protect,
  allowRoles("employee"),
  wrap(controller.requestCorrection),
);
router.patch(
  "/attendance/:id/review",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.reviewCorrection),
);

module.exports = router;
