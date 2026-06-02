const mongoose = require("mongoose");

const ROLES = ["SUPERADMIN", "ADMIN"];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "ADMIN" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

function toPublicUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt,
  };
}

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { User, toPublicUser, ROLES };
