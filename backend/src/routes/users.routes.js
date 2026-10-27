const express = require("express");
const { protect, allowRoles } = require("../middleware/auth");
const { wrap } = require("../utils/routeHelpers");
const controller = require("../controllers/userController");

const router = express.Router();

router.get("/users", protect, allowRoles("admin"), wrap(controller.listUsers));
router.post(
  "/users/hr",
  protect,
  allowRoles("admin"),
  wrap(controller.createHR),
);
router.patch(
  "/users/:id",
  protect,
  allowRoles("admin"),
  wrap(controller.updateUser),
);

module.exports = router;
