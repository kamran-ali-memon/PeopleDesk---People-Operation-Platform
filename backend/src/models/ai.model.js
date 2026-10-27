const mongoose = require("mongoose");
const { Schema } = mongoose;
const { tenantPlugin } = require("../utils/tenant");

const aiLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    prompt: String,
    tool: String,
    success: Boolean,
    durationMs: Number,
  },
  { timestamps: true },
);

function model(name, schema) {
  tenantPlugin(schema);
  return mongoose.models[name] || mongoose.model(name, schema);
 }

module.exports = { AILog: model("AILog", aiLogSchema) };
