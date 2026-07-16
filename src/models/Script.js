const mongoose = require("mongoose");

const scriptSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
    userIds: { type: [mongoose.Schema.Types.ObjectId], default: [], index: true },
    appId:   { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
    title:  { type: String, required: true, trim: true, maxlength: 100 },
    body:   { type: String, required: true, trim: true, maxlength: 5000 },
    description: { type: String, default: null },
    category: {
      type: String,
      required: true,
      enum: [
        "Spiritual",
        "Health",
        "Education",
        "Business",
        "Government",
        "Agriculture",
        "Social",
        "Festivals",
        "Motivation",
        "Real Estate"
      ]
    },
    duration:      { type: String, default: "45s" },
    scheduledDate: { type: String, default: "Self-scheduled" },
    scheduledTime: { type: String, default: "Self-scheduled" },
    approvalStatus: {
      type: String,
      enum: ["Draft", "Pending", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection"],
      default: "Draft"
    },
    imageUrl:          { type: String, default: null },
    rawVideoUrl:       { type: String, default: null },
    processedVideoUrl: { type: String, default: null },
    viralVideoUrl:     { type: String, default: null },
    aiJobId:           { type: String, default: null },
    processingStatus: {
      type: String,
      enum: ["none", "uploading", "processing", "completed", "failed"],
      default: "none"
    },
    processingProgress: { type: Number, default: 0 },
    objectionNote:      { type: String, default: null },
    createdByAdmin:     { type: Boolean, default: false },
    statusHistory: [
      {
        status:    { type: String },
        changedBy: { type: String },
        changedAt: { type: Date, default: Date.now },
        note:      { type: String }
      }
    ]
  },
  { timestamps: true }
);

scriptSchema.index({ userId: 1, category: 1 });
scriptSchema.index({ userId: 1, approvalStatus: 1 });

const Script = mongoose.models.Script || mongoose.model("Script", scriptSchema);
module.exports = { Script };
