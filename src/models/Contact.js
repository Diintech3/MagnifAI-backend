const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "App",
      required: true,
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
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index per workspace to prevent duplicate phone contacts
contactSchema.index({ appId: 1, phone: 1 }, { unique: true });

const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

module.exports = { Contact };
