const mongoose = require("mongoose");
const { Schema } = mongoose;

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    logoData: { type: String, default: "", maxlength: 1400000 },
    active: { type: Boolean, default: false },
    legacyMigration: { type: Boolean, default: false },
  },
  { timestamps: true },
);
companySchema.index({ slug: 1 }, { unique: true });

module.exports = {
  Company: mongoose.models.Company || mongoose.model("Company", companySchema),
};
