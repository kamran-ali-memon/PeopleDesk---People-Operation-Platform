const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/authController");

const router = express.Router();

router.get("/status", wrap(controller.status));
router.post("/setup", wrap(controller.setup));
router.post("/auth/login", wrap(controller.login));
router.get("/auth/me", protect, wrap(controller.me));
router.post("/auth/change-password", protect, wrap(controller.changePassword));

module.exports = router;
