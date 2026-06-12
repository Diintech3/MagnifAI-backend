const mongoose = require("mongoose");
const { resolvePublicLogoUrl } = require("../utils/logoUrl");

const appSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    websiteUrl: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    logoKey: { type: String, trim: true },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    pincode: { type: String, trim: true },

    /** Optional link to an existing app (shown in Account Security dropdown) */
    linkedAppId: { type: mongoose.Schema.Types.ObjectId, ref: "App", default: null },
    passwordHash: { type: String, required: true },

    source: { type: String, default: "Direct", trim: true },
    agentsCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    showCandidates: { type: Boolean, default: false },
    dashboardType: { type: String, default: "default", trim: true }, // e.g. "default", "spiritual", "changemaker"

    // Social media credentials
    social: {
      instagram: {
        userId:   { type: String, trim: true },
        username: { type: String, trim: true },
      },
      twitter: {
        username: { type: String, trim: true },
      },
      facebook: {
        pageId:   { type: String, trim: true },
        pageName: { type: String, trim: true },
      },
      youtube: {
        channelId:   { type: String, trim: true },
        channelName: { type: String, trim: true },
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

function toPublicApp(doc) {
  if (!doc) return null;
  const linked =
    doc.linkedAppId && typeof doc.linkedAppId === "object" && doc.linkedAppId.businessName
      ? { id: doc.linkedAppId._id.toString(), businessName: doc.linkedAppId.businessName }
      : null;

  return {
    id: doc._id.toString(),
    businessName: doc.businessName,
    websiteUrl: doc.websiteUrl,
    gstNumber: doc.gstNumber,
    panNumber: doc.panNumber,
    logoUrl: resolvePublicLogoUrl(doc.logoUrl, doc.logoKey),
    hasPassword: Boolean(doc.passwordHash),
    fullName: doc.fullName,
    email: doc.email,
    mobile: doc.mobile,
    city: doc.city,
    address: doc.address,
    pincode: doc.pincode,
    linkedAppId: linked?.id || (doc.linkedAppId?.toString?.() ?? doc.linkedAppId) || null,
    linkedAppName: linked?.businessName || null,
    source: doc.source,
    agentsCount: doc.agentsCount,
    isActive: doc.isActive,
    showCandidates: doc.showCandidates ?? false,
    dashboardType: doc.dashboardType || "default",
    createdBy: doc.createdBy?.toString?.() || doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const App = mongoose.models.App || mongoose.model("App", appSchema);

module.exports = { App, toPublicApp };
