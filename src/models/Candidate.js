const mongoose = require("mongoose");
const { resolvePublicMediaUrl } = require("../utils/logoUrl");

const ASSEMBLIES = ["MP", "MLA", "MLC", "MC"];

const candidateSchema = new mongoose.Schema(
  {
    appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    name: { type: String, required: true, trim: true },
    partyName: { type: String, required: true, trim: true },
    partyLogoUrl: { type: String, trim: true },
    partyLogoKey: { type: String, trim: true },
    constituency: { type: String, required: true, trim: true },
    assembly: { type: String, required: true, enum: ASSEMBLIES },
    address: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    mobile: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    photoUrl: { type: String, trim: true },
    photoKey: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

candidateSchema.index({ appId: 1, name: 1 });

function toPublicCandidate(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    partyName: doc.partyName,
    partyLogoUrl: resolvePublicMediaUrl(doc.partyLogoUrl, doc.partyLogoKey),
    constituency: doc.constituency,
    assembly: doc.assembly,
    address: doc.address,
    email: doc.email,
    mobile: doc.mobile,
    photoUrl: resolvePublicMediaUrl(doc.photoUrl, doc.photoKey),
    isActive: doc.isActive !== false,
    hasPassword: Boolean(doc.passwordHash),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);

module.exports = { Candidate, toPublicCandidate, ASSEMBLIES };
