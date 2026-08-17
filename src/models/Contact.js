const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "App",
      required: true,
      index: true,
    },
    ceoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CEO",
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastConnected: {
      type: String,
      default: "Just added",
    },
    isWhatsAppActive: {
      type: Boolean,
      default: null,
    },
    isMagnifaiUser: {
      type: Boolean,
      default: false,
    },
    designation: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    socials: {
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" }
    },
    contactType: {
      type: String,
      enum: ["new", "regular", "card"],
      default: "regular"
    },
    category: {
      type: String,
      default: "Business Person"
    },
    isBusinessCard: {
      type: Boolean,
      default: false,
      index: true
    },
    cardImageKey: {
      type: String,
      default: ""
    },
    cardImageUrl: {
      type: String,
      default: ""
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index per workspace and CEO to prevent duplicate phone contacts
contactSchema.index({ appId: 1, ceoId: 1, phone: 1 }, { unique: true });

const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

module.exports = { Contact };
