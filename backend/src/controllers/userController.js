const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { audit } = require("../services/audit");
const { publicUser, fail } = require("./controllerHelpers");

exports.listUsers = async (req, res) =>
  res.json({
    users: await User.find({ role: { $in: ["hr", "employee"] } })
      .select("-password")
      .sort("-createdAt"),
  });
exports.createHR = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8)
    return fail(
      res,
      422,
      "Name, email and password (8+ characters) are required.",
    );
  if (await User.exists({ email: email.toLowerCase().trim() }))
    return fail(res, 409, "An account with this email already exists.");
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: await bcrypt.hash(password, 12),
    role: "hr",
    mustChangePassword: true,
  });
  await audit(req, "hr.created", "User", user._id, null, {
    name: user.name,
    email: user.email,
    role: user.role,
  });
  res.status(201).json({
    user: publicUser(user),
    message: "HR login created. Ask the user to change the temporary password.",
  });
};
exports.updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "User not found.");
  const before = { active: user.active, role: user.role };
  if (typeof req.body.active === "boolean") user.active = req.body.active;
  if (req.body.resetPassword !== undefined) {
    if (String(req.body.resetPassword).length < 8)
      return fail(
        res,
        422,
        "Temporary password must be at least 8 characters.",
      );
    user.password = await bcrypt.hash(String(req.body.resetPassword), 12);
    user.mustChangePassword = true;
  }
  await user.save();
  await audit(req, "user.updated", "User", user._id, before, {
    active: user.active,
    role: user.role,
  });
  res.json({ user: publicUser(user) });
};
