const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/communicationsController");

const router = express.Router();

router.get("/announcements", protect, wrap(controller.listAnnouncements));
router.post(
  "/announcements",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.createAnnouncement),
);
router.patch(
  "/announcements/:id",
  protect,
  allowRoles("admin"),
  wrap(controller.updateAnnouncement),
);
router.delete(
  "/announcements/:id",
  protect,
  allowRoles("admin"),
  wrap(controller.deleteAnnouncement),
);
router.get("/notifications", protect, wrap(controller.listNotifications));
router.patch(
  "/notifications/:id/read",
  protect,
  wrap(controller.readNotification),
);
router.get("/audit", protect, allowRoles("admin"), wrap(controller.auditLogs));

module.exports = router;
