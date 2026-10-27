const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/aiController");
const rateLimit = require("express-rate-limit");
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI request limit reached. Please try again later." },
});

const router = express.Router();

router.post("/ai/chat", protect, aiLimiter, wrap(controller.aiChat));
router.post("/ai/smart-leave", protect, aiLimiter, wrap(controller.smartLeave));
router.post(
  "/ai/summary",
  protect,
  allowRoles("admin", "hr"),
  wrap(controller.aiSummary),
);

module.exports = router;
