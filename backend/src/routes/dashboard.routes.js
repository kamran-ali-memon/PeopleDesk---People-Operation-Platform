const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/dashboardController");

const router = express.Router();

router.get("/dashboard", protect, wrap(controller.dashboard));

module.exports = router;
