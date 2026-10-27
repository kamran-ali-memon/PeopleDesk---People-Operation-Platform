const express = require("express");
const router = express.Router();

router.use(require("./auth.routes"));
router.use(require("./organization.routes"));
router.use(require("./users.routes"));
router.use(require("./employees.routes"));
router.use(require("./attendance.routes"));
router.use(require("./leave.routes"));
router.use(require("./dashboard.routes"));
router.use(require("./payroll.routes"));
router.use(require("./communications.routes"));
router.use(require("./ai.routes"));
router.use(require("./workflows.routes"));

module.exports = router;
