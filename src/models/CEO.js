const mongoose = require("mongoose");
const { resolvePublicMediaUrl } = require("../utils/logoUrl");

const ceoSchema = new mongoose.Schema(
  {
    appId:        { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    name:         { type: String, required: true, trim: true },
    company:      { type: String, trim: true },
    industry:     { type: String, trim: true },
    designation:  { type: String, trim: true },
    website:      { type: String, trim: true },
    city:         { type: String, trim: true },
    address:      { type: String, trim: true },
    pincode:      { type: String, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true, unique: true },
    mobile:       { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    photoUrl:     { type: String, trim: true },
    photoKey:     { type: String, trim: true },
    isActive:     { type: Boolean, default: true },
    resetOtp:     { type: String },
    resetOtpExpires: { type: Date },
    ragClientId:  { type: String, trim: true },
    ragToken:     { type: String, trim: true },
    agentId:      { type: String, trim: true },
    sendMode:     { type: String, enum: ["auto", "manual"], default: "auto" },
    telephonyMode: { type: String, enum: ["auto", "manual"], default: "auto" },
    adminReviewMode: { type: String, enum: ["auto", "manual"], default: "manual" },
    whatsAppSendMode: { type: String, enum: ["auto", "manual"], default: "manual" },
    whatsAppClientId: { type: String, trim: true },
    whatsAppPhoneId:  { type: String, trim: true },
    whatsAppWabaId:   { type: String, trim: true },
    whatsAppToken:    { type: String, trim: true },
    isWhatsAppConnected: { type: Boolean, default: false },
    adplifAiClientId: { type: String, trim: true },
    adplifAiApiKey:   { type: String, trim: true },
    clientKey:        { type: String, trim: true, default: null, unique: true, sparse: true },
    gstNo:            { type: String, default: "NAN" },
    panNo:            { type: String, default: "NAN" },
    yovoClientId:     { type: String, trim: true, default: null },
    isYovoConnected:  { type: Boolean, default: false },
    yovoToken:        { type: String, default: null },
    yovoClientInfo:   { type: mongoose.Schema.Types.Mixed, default: null },
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
        youtubeRefreshToken: { type: String, trim: true },
        youtubeAccessToken: { type: String, trim: true },
        youtubeTokenExpires: { type: Date }
      },
    },
  },
  { timestamps: true },
);

ceoSchema.index({ appId: 1, name: 1 });

function toPublicCEO(doc) {
  if (!doc) return null;
  return {
    id:          doc._id.toString(),
    name:        doc.name,
    company:     doc.company,
    industry:    doc.industry,
    designation: doc.designation,
    website:     doc.website,
    city:        doc.city,
    address:     doc.address,
    pincode:     doc.pincode,
    email:       doc.email,
    mobile:      doc.mobile,
    photoUrl:    resolvePublicMediaUrl(doc.photoUrl, doc.photoKey),
    isActive:    doc.isActive !== false,
    hasPassword: Boolean(doc.passwordHash),
    agentId:     doc.agentId,
    ragClientId: doc.ragClientId,
    ragToken:    doc.ragToken,
    sendMode:    doc.sendMode || "auto",
    telephonyMode: doc.telephonyMode || "auto",
    adminReviewMode: doc.adminReviewMode || "manual",
    whatsAppSendMode: doc.whatsAppSendMode || "manual",
    whatsAppClientId: doc.whatsAppClientId,
    isWhatsAppConnected: doc.isWhatsAppConnected || false,
    adplifAiClientId: doc.adplifAiClientId,
    adplifAiApiKey: doc.adplifAiApiKey,
    clientKey: doc.clientKey || null,
    gstNo: doc.gstNo || "NAN",
    panNo: doc.panNo || "NAN",
    yovoClientId: doc.yovoClientId || null,
    isYovoConnected: doc.isYovoConnected || false,
    yovoToken: doc.yovoToken || null,
    yovoClientInfo: doc.yovoClientInfo || null,
    createdAt:   doc.createdAt,
    updatedAt:   doc.updatedAt,
  };
}

const CEO = mongoose.models.CEO || mongoose.model("CEO", ceoSchema);
module.exports = { CEO, toPublicCEO };
