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
    createdAt:   doc.createdAt,
    updatedAt:   doc.updatedAt,
  };
}

const CEO = mongoose.models.CEO || mongoose.model("CEO", ceoSchema);
module.exports = { CEO, toPublicCEO };
