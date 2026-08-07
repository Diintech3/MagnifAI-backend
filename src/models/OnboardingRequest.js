const mongoose = require("mongoose");

const onboardingRequestSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, index: true },
    mobile: { type: String, trim: true },
    organizationName: { type: String, trim: true },
    designation: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true },
    description: { type: String, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    photoKey: { type: String, trim: true },
    
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true
    },
    
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    
    emailOtp: { type: String },
    mobileOtp: { type: String },
    
    rejectionReason: { type: String, trim: true }
  },
  { timestamps: true }
);

const OnboardingRequest = mongoose.models.OnboardingRequest || mongoose.model("OnboardingRequest", onboardingRequestSchema);

module.exports = { OnboardingRequest };
