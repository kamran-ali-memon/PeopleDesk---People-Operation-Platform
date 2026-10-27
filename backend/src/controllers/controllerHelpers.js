const jwt = require("jsonwebtoken");
const { Employee } = require("../models");
const { dateKey } = require("../utils/dates");

function makeToken(user) {
  return jwt.sign({ id: user._id, companyId: user.companyId, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}
function publicUser(user) {
  return {
    id: user._id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
  };
}
function fail(res, status, message) {
  return res.status(status).json({ message });
}
function startOfToday() {
  return `${dateKey()}T00:00:00`;
}
async function currentEmployee(req) {
  if (req.user.role !== "employee") return null;
  if (!req.user.employeeId) return null;
  return Employee.findById(req.user.employeeId);
}
function visibleEmployeeFilter(req) {
  return req.user.role === "employee" ? { _id: req.user.employeeId } : {};
}

module.exports = {
  makeToken,
  publicUser,
  fail,
  startOfToday,
  currentEmployee,
  visibleEmployeeFilter,
};
