const mongoose = require("mongoose");

const yearResultSchema = new mongoose.Schema(
  {
    party: { type: String, required: true, trim: true, uppercase: true },
    candidate: { type: String, trim: true, default: "" },
    votes: { type: Number, default: 0 },
    votePercent: { type: Number, default: 0 },
    runnerUpParty: { type: String, trim: true, uppercase: true },
    runnerUpCandidate: { type: String, trim: true },
    runnerUpVotes: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    turnout: { type: Number, default: null },
  },
  { _id: false },
);

const constituencyResultSchema = new mongoose.Schema(
  {
    stateCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    acNo: { type: Number, required: true, min: 1 },
    acName: { type: String, required: true, trim: true },
    district: { type: String, trim: true, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    results: {
      2012: { type: yearResultSchema, default: null },
      2017: { type: yearResultSchema, default: null },
      2022: { type: yearResultSchema, default: null },
    },
  },
  { timestamps: true },
);

constituencyResultSchema.index({ stateCode: 1, acNo: 1 }, { unique: true });
constituencyResultSchema.index({ stateCode: 1, acName: "text", district: "text" });

const ConstituencyResult =
  mongoose.models.ConstituencyResult ||
  mongoose.model("ConstituencyResult", constituencyResultSchema);

module.exports = { ConstituencyResult };
