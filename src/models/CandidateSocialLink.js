const mongoose = require("mongoose");

const candidateSocialLinkSchema = new mongoose.Schema(
  {
    // Constituency identifiers
    stateCode:    { type: String, required: true, uppercase: true, trim: true, default: "UP" },
    bodyType:     { type: String, required: true, uppercase: true, trim: true },
    year:         { type: String, required: true, trim: true },
    seatNo:       { type: Number, required: true },
    seatName:     { type: String, required: true, trim: true },
    candidateName:{ type: String, required: true, trim: true },

    // Social platform handles / page IDs
    instagram: {
      igUserId:   { type: String, trim: true, default: "" }, // Instagram Business Account ID
      handle:     { type: String, trim: true, default: "" }, // @handle for display
      profileUrl: { type: String, trim: true, default: "" },
    },
    facebook: {
      pageId:     { type: String, trim: true, default: "" },
      handle:     { type: String, trim: true, default: "" },
      profileUrl: { type: String, trim: true, default: "" },
    },
    youtube: {
      channelId:  { type: String, trim: true, default: "" },
      handle:     { type: String, trim: true, default: "" },
      profileUrl: { type: String, trim: true, default: "" },
    },
    twitter: {
      handle:     { type: String, trim: true, default: "" },
      profileUrl: { type: String, trim: true, default: "" },
    },
    threads: {
      handle:     { type: String, trim: true, default: "" },
      profileUrl: { type: String, trim: true, default: "" },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique per candidate per election
candidateSocialLinkSchema.index(
  { stateCode: 1, bodyType: 1, year: 1, seatNo: 1, candidateName: 1 },
  { unique: true }
);

const CandidateSocialLink =
  mongoose.models.CandidateSocialLink ||
  mongoose.model("CandidateSocialLink", candidateSocialLinkSchema);

module.exports = { CandidateSocialLink };
