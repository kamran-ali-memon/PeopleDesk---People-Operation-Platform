const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Company, User } = require("../models");
const { withTenant } = require("../utils/tenant");

async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token)
    return res.status(401).json({ message: "Please sign in to continue." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!mongoose.isValidObjectId(payload.id) || !mongoose.isValidObjectId(payload.companyId))
      return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." });

    return withTenant(payload.companyId, async () => {
      const [user, company] = await Promise.all([
        User.findById(payload.id).select("-password"),
        Company.findOne({ _id: payload.companyId, active: true }),
      ]);
      if (!user || !user.active || String(user.companyId) !== String(payload.companyId) || !company)
        return res.status(401).json({ message: "This account is inactive or no longer exists." });

      req.user = user;
      req.company = company;
      req.companyId = company._id;
      if (user.mustChangePassword && req.path !== "/auth/change-password") {
        return res.status(403).json({
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Change your temporary password before using PeopleDesk.",
        });
      }
      return next();
    });
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ message: "You do not have permission to do this." });
    next();
  };
}
module.exports = { protect, allowRoles };
