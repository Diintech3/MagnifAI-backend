const mongoose = require("mongoose");

const ceoProfileSchema = new mongoose.Schema(
  {
    appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },

    // Basic Info
    name:       { type: String, required: true, trim: true },
    company:    { type: String, trim: true },
    website:    { type: String, trim: true },
    industry:   { type: String, trim: true },
    country:    { type: String, trim: true },
    email:      { type: String, trim: true },
    phone:      { type: String, trim: true },
    avatarUrl:  { type: String, trim: true },

    // Knowledge Base
    biography:    { type: String, trim: true },
    vision:       { type: String, trim: true },
    mission:      { type: String, trim: true },
    achievements: [{ type: String, trim: true }],
    awards:       [{ type: String, trim: true }],
    products:     [{ type: String, trim: true }],
    services:     [{ type: String, trim: true }],

    // Content Strategy
    brandVoice:     { type: String, trim: true },
    targetAudience: { type: String, trim: true },
    keywords:       [{ type: String, trim: true }],
    competitors:    [{ type: String, trim: true }],
    contentGoals:   [{ type: String, trim: true }],

    // Social Links
    social: {
      linkedin:  { type: String, trim: true },
      twitter:   { type: String, trim: true },
      instagram: { type: String, trim: true },
      youtube:   { type: String, trim: true },
      facebook:  { type: String, trim: true },
      website:   { type: String, trim: true },
    },

    // AI Memory — stores context for personalized generation
    aiMemory: [{ type: String, trim: true }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ceoProfileSchema.index({ appId: 1, name: 1 });

const CeoProfile = mongoose.models.CeoProfile || mongoose.model("CeoProfile", ceoProfileSchema);
module.exports = { CeoProfile };
