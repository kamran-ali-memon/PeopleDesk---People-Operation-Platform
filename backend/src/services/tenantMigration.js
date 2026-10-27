const mongoose = require("mongoose");
const {
  Company,
  User,
  Settings,
  Department,
  Designation,
  Employee,
  Attendance,
  LeaveType,
  Holiday,
  Leave,
  Payroll,
  Announcement,
  Notification,
  AuditLog,
  AILog,
  ExpenseClaim,
  ReviewCycle,
  PerformanceReview,
} = require("../models");
const { companySlug } = require("../utils/tenantSlug");

const tenantModels = [
  User, Settings, Department, Designation, Employee, Attendance, LeaveType,
  Holiday, Leave, Payroll, Announcement, Notification, AuditLog, AILog,
  ExpenseClaim, ReviewCycle, PerformanceReview,
];

const legacyIndexes = [
  [User, "email_1"],
  [Employee, "employeeCode_1"],
  [Employee, "email_1"],
  [Department, "name_1"],
  [Attendance, "employee_1_date_1"],
  [Payroll, "month_1_employee_1"],
];

async function dropConflictingSettingsIndex() {
  try {
    const indexes = await Settings.collection.indexes();
    const existing = indexes.find((index) => index.name === "companyId_1");
    if (existing && !existing.unique)
      await Settings.collection.dropIndex("companyId_1");
  } catch (error) {
    if (error.code !== 26 && error.codeName !== "NamespaceNotFound") throw error;
  }
}

async function dropLegacyIndexes() {
  for (const [model, indexName] of legacyIndexes) {
    try {
      await model.collection.dropIndex(indexName);
    } catch (error) {
      if (error.codeName !== "IndexNotFound" && error.code !== 27 && error.code !== 26) throw error;
    }
  }
}

async function associateLegacyRecords(company) {
  for (const model of tenantModels) {
    await model.collection.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: company._id } },
    );
  }
  await Settings.collection.updateMany(
    { companyId: company._id },
    { $set: { companyName: company.name, setupComplete: true } },
  );
  company.active = true;
  await company.save();
}

async function migrateLegacyWorkspace() {
  let migration = await Company.findOne({ legacyMigration: true });
  if (migration) {
    if (!migration.active) await associateLegacyRecords(migration);
    return;
  }
  if (await Company.collection.countDocuments({})) return;

  const [userCount, settings] = await Promise.all([
    User.collection.countDocuments({}),
    Settings.collection.findOne({}),
  ]);
  if (!userCount && !settings) return;

  const name = String(settings?.companyName || "Migrated HR workspace").trim();
  const slug = companySlug(name) || "migrated-workspace";
  migration = await Company.create({
    name,
    slug: slug + "-legacy",
    active: false,
    legacyMigration: true,
  });
  await associateLegacyRecords(migration);
}

async function ensureNoUnassignedRecords() {
  const unassigned = [];
  const counts = await Promise.all(
    tenantModels.map((model) =>
      model.collection.countDocuments({ companyId: { $exists: false } }),
    ),
  );
  counts.forEach((count, index) => {
    if (count)
      unassigned.push(tenantModels[index].collection.collectionName + ": " + count);
  });
  if (unassigned.length) {
    throw new Error("Tenant migration required; records have no company assignment: " + unassigned.join(", "));
  }
}

async function initializeTenantDatabase() {
  await migrateLegacyWorkspace();
  await ensureNoUnassignedRecords();
  await dropConflictingSettingsIndex();
  await dropLegacyIndexes();
  await Promise.all([Company, ...tenantModels].map((model) => model.createIndexes()));
}

module.exports = { initializeTenantDatabase };
