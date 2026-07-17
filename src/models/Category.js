const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    section:  { type: String, required: true, default: "ugc_prompter", index: true },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String }
  },
  { timestamps: true }
);

// Unique index on name and section combination
categorySchema.index({ name: 1, section: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
module.exports = { Category };
