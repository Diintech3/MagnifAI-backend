const mongoose = require("mongoose");

const promptLibrarySchema = new mongoose.Schema(
  {
    appId:       { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    contentType: { type: String, required: true, trim: true },
    title:       { type: String, required: true, trim: true },
    prompt:      { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    tags:        [{ type: String, trim: true }],
    isDefault:   { type: Boolean, default: false },
    usageCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

promptLibrarySchema.index({ appId: 1, contentType: 1 });

const PromptLibrary = mongoose.models.PromptLibrary || mongoose.model("PromptLibrary", promptLibrarySchema);
module.exports = { PromptLibrary };
