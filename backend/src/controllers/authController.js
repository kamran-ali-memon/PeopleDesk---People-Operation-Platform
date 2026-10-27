const bcrypt = require("bcryptjs");
const { Company, User, Settings, LeaveType } = require("../models");
const { withTenant } = require("../utils/tenant");
const { companySlug } = require("../utils/tenantSlug");
const { audit } = require("../services/audit");
const { makeToken, publicUser, fail } = require("./controllerHelpers");

const defaultLeaveTypes = [
  { name: "Casual", quota: 10, paid: true },
  { name: "Sick", quota: 8, paid: true },
  { name: "Annual", quota: 14, paid: true },
  { name: "Unpaid", quota: 0, paid: false },
];

function publicCompany(company) {
  return { id: company._id, name: company.name, slug: company.slug, logoData: company.logoData || "" };
}

const { validLogoData } = require("../utils/branding");

exports.status = async (req, res) => {
  const hasCompanies = Boolean(await Company.exists({ active: true }));
  res.json({ hasCompanies, platformName: "PeopleDesk" });
};

exports.setup = async (req, res) => {
  const { companyName, name, email, password } = req.body || {};
  const slug = companySlug(req.body?.companySlug || companyName);
  if (typeof companyName !== "string" || !companyName.trim() || typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 8)
    return fail(res, 422, "Company name, admin name, valid email, and a password of at least 8 characters are required.");
  if (slug.length < 3 || slug.length > 48)
    return fail(res, 422, "Choose a company name or identifier with at least 3 letters or numbers.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail(res, 422, "Enter a valid work email address.");
  if (!validLogoData(req.body.logoData))
    return fail(res, 422, "Use a PNG, JPEG, or WebP logo image smaller than 1 MB.");

  let company;
  try {
    company = await Company.create({
      name: companyName.trim(),
      slug,
      logoData: req.body.logoData || "",
      active: false,
    });
    const result = await withTenant(company._id, async () => {
      const admin = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password, 12),
        role: "admin",
        companyId: company._id,
      });
      await Settings.create({
        companyId: company._id,
        companyName: company.name,
        setupComplete: true,
      });
      for (const type of defaultLeaveTypes)
        await LeaveType.create({ ...type, companyId: company._id });
      company.active = true;
      await company.save();
      await audit(
        { user: admin, ip: req.ip },
        "company.registered",
        "Company",
        company._id,
        null,
        { name: company.name, slug: company.slug },
      );
      return { admin };
    });
    res.status(201).json({
      token: makeToken(result.admin),
      user: publicUser(result.admin),
      company: publicCompany(company),
      message: "Company workspace created.",
    });
  } catch (error) {
    if (company) {
      await withTenant(company._id, async () => {
        await Promise.all([
          User.deleteMany({ companyId: company._id }),
          Settings.deleteMany({ companyId: company._id }),
          LeaveType.deleteMany({ companyId: company._id }),
        ]);
      });
      await Company.deleteOne({ _id: company._id });
    }
    if (error.code === 11000)
      return fail(res, 409, "That company identifier or email is already in use.");
    throw error;
  }
};

exports.login = async (req, res) => {
  const { email, password, companySlug: requestedSlug, role: requestedRole } = req.body || {};
  const slug = companySlug(requestedSlug);
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || !["admin", "hr", "employee"].includes(requestedRole))
    return fail(res, 401, "Role, email, or password is incorrect.");
  let company;
  let user;
  const normalizedEmail = email.toLowerCase().trim();
  if (slug) {
    company = await Company.findOne({ slug, active: true });
    if (company) {
      user = await withTenant(company._id, () =>
        User.findOne({ email: normalizedEmail }),
      );
      if (!user || !user.active || user.role !== requestedRole || !(await bcrypt.compare(password, user.password)))
        user = null;
    }
  } else {
    const candidates = await User.collection
      .find({ email: normalizedEmail, role: requestedRole, active: true })
      .toArray();
    const matches = [];
    for (const candidate of candidates) {
      const candidateCompany = await Company.findOne({
        _id: candidate.companyId,
        active: true,
      });
      if (candidateCompany && await bcrypt.compare(password, candidate.password))
        matches.push({ user: User.hydrate(candidate), company: candidateCompany });
    }
    if (matches.length === 1) {
      ({ user, company } = matches[0]);
    } else if (matches.length > 1) {
      return fail(res, 409, "These credentials match more than one company. Ask your Admin which company workspace to use.");
    }
  }
  if (!company || !user)
    return fail(res, 401, "Role, email, or password is incorrect.");
  res.json({
    token: makeToken(user),
    user: publicUser(user),
    company: publicCompany(company),
  });
};

exports.me = async (req, res) => {
  const company = await Company.findOne({ _id: req.user.companyId, active: true });
  res.json({ user: publicUser(req.user), company: company ? publicCompany(company) : null });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8)
    return fail(res, 422, "Enter your current password and a new password with at least 8 characters.");
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(currentPassword, user.password)))
    return fail(res, 400, "Current password is incorrect.");
  user.password = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  await user.save();
  await audit(req, "password.changed", "User", user._id);
  res.json({ message: "Password updated successfully." });
};
