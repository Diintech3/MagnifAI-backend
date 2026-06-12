const mongoose = require("mongoose");

const contentFolderSchema = new mongoose.Schema(
  {
    appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    name:  { type: String, required: true, trim: true },
    topic: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    category: { type: String, enum: ["Alpha", "Beta", "Gamma"], default: "Alpha" },
    color: { type: String, default: "#6366f1" },
  },
  { timestamps: true }
);

contentFolderSchema.index({ appId: 1, name: 1 });

const ContentFolder = mongoose.models.ContentFolder || mongoose.model("ContentFolder", contentFolderSchema);
module.exports = { ContentFolder };
