const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    appId:       { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status:      { type: String, enum: ["planned", "active", "paused", "completed"], default: "planned" },
    goal:        { type: String, trim: true },
    startDate:   { type: Date },
    endDate:     { type: Date },
  },
  { timestamps: true }
);

const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
module.exports = { Campaign };
