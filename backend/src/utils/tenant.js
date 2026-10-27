const { AsyncLocalStorage } = require("node:async_hooks");
const mongoose = require("mongoose");

const storage = new AsyncLocalStorage();

function currentTenantId() {
  return storage.getStore() || null;
}

function withTenant(companyId, callback) {
  if (!companyId || !mongoose.isValidObjectId(companyId))
    throw new Error("A valid tenant context is required.");
  return storage.run(String(companyId), callback);
}

function tenantPlugin(schema) {
  if (schema.$tenantPluginApplied) return;
  schema.$tenantPluginApplied = true;
  schema.add({
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      immutable: true,
    },
  });
  const hasCompanyOnlyIndex = schema.indexes().some(([keys]) =>
    Object.keys(keys).length === 1 && keys.companyId === 1,
  );
  if (!hasCompanyOnlyIndex) schema.index({ companyId: 1 });

  const queryOperations = [
    "count",
    "countDocuments",
    "deleteMany",
    "deleteOne",
    "distinct",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndReplace",
    "findOneAndUpdate",
    "replaceOne",
    "update",
    "updateMany",
    "updateOne",
  ];
  schema.pre(queryOperations, function scopeQuery() {
    const companyId = currentTenantId();
    if (!companyId) {
      this.setQuery({ $and: [this.getQuery() || {}, { _id: { $exists: false } }] });
      return;
    }
    this.setQuery({
      $and: [this.getQuery() || {}, { companyId }],
    });
    if (this.getOptions().upsert) {
      const update = this.getUpdate() || {};
      update.$setOnInsert = {
        ...(update.$setOnInsert || {}),
        companyId,
      };
      this.setUpdate(update);
    }
  });

  schema.pre("aggregate", function scopeAggregate() {
    const companyId = currentTenantId();
    this.pipeline().unshift({
      $match: companyId
        ? { companyId: new mongoose.Types.ObjectId(companyId) }
        : { _id: { $exists: false } },
    });
  });

  schema.pre("validate", function requireTenant() {
    const companyId = currentTenantId();
    if (companyId) {
      if (this.companyId && String(this.companyId) !== String(companyId))
        throw new Error("Record belongs to a different company.");
      this.companyId = companyId;
    }
    if (!this.companyId)
      throw new Error("A company is required to create this record.");
  });
}

module.exports = { currentTenantId, withTenant, tenantPlugin };
