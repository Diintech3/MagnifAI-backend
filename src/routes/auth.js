const express = require("express");
const { z } = require("zod");
const { User, toPublicUser } = require("../models/User");
const { App, toPublicApp } = require("../models/App");
const { Candidate, toPublicCandidate } = require("../models/Candidate");
const { CEO, toPublicCEO } = require("../models/CEO");
const { OnboardingRequest } = require("../models/OnboardingRequest");
const { verifyPassword, hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateOtp, sendEmailOtp, sendWhatsAppOtp } = require("../utils/otp");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const multer = require("multer");

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("INVALID_FILE_TYPE"), allowed.includes(file.mimetype));
  },
}).fields([{ name: "photo", maxCount: 1 }]);

const router = express.Router();

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email()),
  password: z.string().min(1),
});

function signAppToken(app) {
  const publicApp = toPublicApp(app);
  return signAccessToken({
    sub: publicApp.id,
    email: publicApp.email,
    role: "APP",
    name: publicApp.businessName,
    businessName: publicApp.businessName,
  });
}

function signCandidateToken(candidate) {
  const publicCandidate = toPublicCandidate(candidate);
  return signAccessToken({
    sub: publicCandidate.id,
    email: publicCandidate.email,
    role: "CANDIDATE",
    name: publicCandidate.name,
    constituency: publicCandidate.constituency,
    assembly: publicCandidate.assembly,
  });
}

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

    const { email, password } = body.data;

    const user = await User.findOne({ email });
    if (!user || !user.isActive || !user.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const publicUser = toPublicUser(user);
    const token = signAccessToken({
      sub: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      name: publicUser.name,
    });

    return res.json({
      accessToken: token,
      user: {
        id: publicUser.id,
        email: publicUser.email,
        role: publicUser.role,
        name: publicUser.name,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/login]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.get("/app/list", async (req, res) => {
  const apps = await App.find({ isActive: true }).select("businessName email").sort({ businessName: 1 });
  return res.json({ apps: apps.map((a) => ({ id: a._id.toString(), businessName: a.businessName, email: a.email })) });
});

router.post("/app/login", async (req, res) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

    const { email, password } = body.data;
    const app = await App.findOne({ email });
    if (!app || !app.isActive || !app.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await verifyPassword(password, app.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const populated = await App.findById(app._id).populate("linkedAppId", "businessName");
    const accessToken = signAppToken(populated);

    return res.json({
      accessToken,
      user: {
        id: populated._id.toString(),
        email: populated.email,
        role: "APP",
        name: populated.businessName,
        businessName: populated.businessName,
        showCandidates: populated.showCandidates ?? false,
        dashboardType: populated.dashboardType || "default",
        isCEO: false,
      },
      app: toPublicApp(populated),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/app/login]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/candidate/login", async (req, res) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

    const { email, password } = body.data;
    const candidate = await Candidate.findOne({ email });
    if (!candidate || !candidate.isActive || !candidate.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await verifyPassword(password, candidate.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const accessToken = signCandidateToken(candidate);
    const publicCandidate = toPublicCandidate(candidate);

    return res.json({
      accessToken,
      user: {
        id: publicCandidate.id,
        email: publicCandidate.email,
        role: "CANDIDATE",
        name: publicCandidate.name,
        constituency: publicCandidate.constituency,
        assembly: publicCandidate.assembly,
      },
      candidate: publicCandidate,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/candidate/login]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/ceo/login", async (req, res) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

    const { email, password } = body.data;
    const ceo = await CEO.findOne({ email });
    if (!ceo || !ceo.isActive || !ceo.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await verifyPassword(password, ceo.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const accessToken = signAccessToken({
      sub: ceo._id.toString(),
      appId: ceo.appId.toString(),
      email: ceo.email,
      role: "CEO",
      name: ceo.name,
    });

    return res.json({
      accessToken,
      user: {
        id: ceo._id.toString(),
        appId: ceo.appId.toString(),
        email: ceo.email,
        role: "CEO",
        name: ceo.name,
        businessName: ceo.name,
        showCandidates: false,
        dashboardType: "default",
        isCEO: true,
      },
      ceo: toPublicCEO(ceo),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/ceo/login]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const { sub, role, appId } = req.user;

    // 1. If role is SUPERADMIN or ADMIN
    if (role === "SUPERADMIN" || role === "ADMIN") {
      const user = await User.findById(sub);
      if (!user || !user.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
      const publicUser = toPublicUser(user);
      return res.json({
        id: publicUser.id,
        email: publicUser.email,
        role: publicUser.role,
        name: publicUser.name,
        isCEO: false,
      });
    }

    // 2. If role is CEO or has appId
    if (role === "CEO" || appId) {
      const ceo = await CEO.findById(sub);
      if (!ceo || !ceo.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
      
      const publicCeo = toPublicCEO(ceo);
      return res.json({
        id: ceo._id.toString(),
        appId: ceo.appId.toString(),
        email: ceo.email,
        role: "CEO",
        name: ceo.name,
        businessName: ceo.name,
        showCandidates: false,
        dashboardType: "default",
        isCEO: true,
        designation: ceo.designation,
        company: ceo.company,
        ragClientId: ceo.ragClientId || null,
        ragToken: ceo.ragToken || null,
        
        // Add missing profile fields
        mobile: publicCeo.mobile,
        industry: publicCeo.industry,
        website: publicCeo.website,
        city: publicCeo.city,
        address: publicCeo.address,
        pincode: publicCeo.pincode,
        photoUrl: publicCeo.photoUrl,
        sendMode: publicCeo.sendMode,
        adminReviewMode: publicCeo.adminReviewMode,
        social: ceo.social || {},
        createdAt: publicCeo.createdAt,
        updatedAt: publicCeo.updatedAt
      });
    }

    // 3. If role is CANDIDATE
    if (role === "CANDIDATE") {
      const candidate = await Candidate.findById(sub);
      if (!candidate || !candidate.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
      const publicCandidate = toPublicCandidate(candidate);
      return res.json({
        id: publicCandidate.id,
        email: publicCandidate.email,
        role: "CANDIDATE",
        name: publicCandidate.name,
        constituency: publicCandidate.constituency,
        assembly: publicCandidate.assembly,
        candidate: publicCandidate,
        isCEO: false,
      });
    }

    // 4. If role is APP
    if (role === "APP") {
      const app = await App.findById(sub).populate("linkedAppId", "businessName");
      if (!app || !app.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
      const publicApp = toPublicApp(app);
      return res.json({
        id: publicApp.id,
        email: publicApp.email,
        role: "APP",
        name: publicApp.businessName,
        businessName: publicApp.businessName,
        showCandidates: app.showCandidates ?? false,
        dashboardType: app.dashboardType || "default",
        app: publicApp,
        isCEO: false,
      });
    }

    return res.status(400).json({ error: "INVALID_ROLE" });
  } catch (err) {
    console.error("[auth/me]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/unified-login", async (req, res) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

    const { email, password } = body.data;
    const searchEmail = email.toLowerCase();

    // 1. Search in CEO
    const ceo = await CEO.findOne({ email: searchEmail });
    if (ceo && ceo.isActive && ceo.passwordHash) {
      const ok = await verifyPassword(password, ceo.passwordHash);
      if (ok) {
        const accessToken = signAccessToken({
          sub: ceo._id.toString(),
          appId: ceo.appId.toString(),
          email: ceo.email,
          role: "CEO",
          name: ceo.name,
        });
        return res.json({
          accessToken,
          role: "CEO",
          user: {
            id: ceo._id.toString(),
            appId: ceo.appId.toString(),
            email: ceo.email,
            role: "CEO",
            name: ceo.name,
            businessName: ceo.name,
            showCandidates: false,
            dashboardType: "default",
            isCEO: true,
          },
        });
      }
    }

    // 2. Search in Candidate
    const candidate = await Candidate.findOne({ email: searchEmail });
    if (candidate && candidate.isActive && candidate.passwordHash) {
      const ok = await verifyPassword(password, candidate.passwordHash);
      if (ok) {
        const accessToken = signCandidateToken(candidate);
        const publicCandidate = toPublicCandidate(candidate);
        return res.json({
          accessToken,
          role: "CANDIDATE",
          user: {
            id: publicCandidate.id,
            email: publicCandidate.email,
            role: "CANDIDATE",
            name: publicCandidate.name,
            constituency: publicCandidate.constituency,
            assembly: publicCandidate.assembly,
          },
        });
      }
    }

    // Credentials don't match or not found
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/unified-login]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── Google Client ID Retrieval Route ──────────────────────────────────────
router.get("/google-client-id", (req, res) => {
  return res.json({ clientId: process.env.Google_Client_ID });
});

// ── Google Login / Verification Route ────────────────────────────────────
router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }

    const axios = require("axios");

    // Verify token with Google API
    let payload;
    try {
      const tokenInfoRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      payload = tokenInfoRes.data;
    } catch (err) {
      console.error("[google-verify-error]", err.message);
      return res.status(400).json({ error: "Invalid Google token" });
    }

    // Verify client ID audience (accept either Web or Firebase/Mobile Client IDs)
    const allowedClientIds = [
      process.env.Google_Client_ID,
      process.env.FIREBASE_GOOGLE_CLIENT_ID
    ].filter(Boolean);

    if (!allowedClientIds.includes(payload.aud)) {
      console.error("[google-verify-error] Token audience mismatch. Expected one of:", allowedClientIds, "Got:", payload.aud);
      return res.status(400).json({ error: "Token audience mismatch" });
    }

    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({ error: "Email not provided by Google" });
    }

    // 1. Search in CEO
    const ceo = await CEO.findOne({ email: email.toLowerCase() });
    if (ceo) {
      if (!ceo.isActive) {
        return res.status(401).json({ error: "UNAUTHORIZED_ACCOUNT_INACTIVE" });
      }
      
      // Update Google ID if not already saved
      if (!ceo.googleId && googleId) {
        ceo.googleId = googleId;
        await ceo.save();
      }

      const accessToken = signAccessToken({
        sub: ceo._id.toString(),
        appId: ceo.appId.toString(),
        email: ceo.email,
        role: "CEO",
        name: ceo.name,
        businessName: ceo.name,
        showCandidates: false,
        dashboardType: "default",
        isCEO: true,
      });

      return res.json({
        success: true,
        accessToken,
        role: "CEO",
        user: {
          id: ceo._id.toString(),
          appId: ceo.appId ? ceo.appId.toString() : "",
          email: ceo.email,
          role: "CEO",
          name: ceo.name,
          businessName: ceo.name,
          showCandidates: false,
          dashboardType: "default",
          isCEO: true,
        }
      });
    }

    // 2. Search in Candidate
    const candidate = await Candidate.findOne({ email: email.toLowerCase() });
    if (candidate) {
      if (!candidate.isActive) {
        return res.status(401).json({ error: "UNAUTHORIZED_ACCOUNT_INACTIVE" });
      }

      // Update Google ID if not already saved
      if (!candidate.googleId && googleId) {
        candidate.googleId = googleId;
        await candidate.save();
      }

      const accessToken = signAccessToken({
        sub: candidate._id.toString(),
        email: candidate.email,
        role: "CANDIDATE",
        name: candidate.name,
        isCEO: false,
      });

      return res.json({
        success: true,
        accessToken,
        role: "CANDIDATE",
        user: {
          id: candidate._id.toString(),
          email: candidate.email,
          role: "CANDIDATE",
          name: candidate.name,
          constituency: candidate.constituency,
          assembly: candidate.assembly,
        }
      });
    }

    // 3. Search in Onboarding Requests
    let request = await OnboardingRequest.findOne({ email: email.toLowerCase() });
    if (request) {
      if (request.status === "Pending") {
        // If request is complete, show AwaitingApproval
        if (request.isMobileVerified && request.name && request.photoUrl) {
          return res.json({
            success: false,
            status: "AwaitingApproval",
            message: "Your onboarding request is awaiting Admin review.",
            email: request.email,
            organizationName: request.organizationName
          });
        }
        
        // Otherwise, update googleId/verification and let them complete it
        request.googleId = googleId;
        request.isEmailVerified = true;
        await request.save();
        
        return res.json({
          success: false,
          status: "RegisterRequired",
          message: "Please complete your registration request.",
          email,
          name: request.name || name,
          googleId
        });
      }
      
      if (request.status === "Rejected") {
        // Clear the rejected request
        await OnboardingRequest.deleteOne({ _id: request._id });
        request = null; // Set to null so we create a fresh one below
      }
    }

    if (!request) {
      // Create a new verified onboarding request session
      const newRequest = new OnboardingRequest({
        email: email.toLowerCase(),
        googleId,
        isEmailVerified: true,
        status: "Pending"
      });
      await newRequest.save();
    }

    return res.json({
      success: false,
      status: "RegisterRequired",
      message: "Google account connected! Please complete your profile registration.",
      email,
      name,
      googleId
    });
  } catch (err) {
    console.error("[google-login-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── Onboarding 4-Step Signup Flow ──────────────────────────────────────────

// Step 1: Send Email Verification OTP
router.post("/register-step1-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const targetEmail = email.toLowerCase().trim();

    // Check if already registered
    const existingCEO = await CEO.findOne({ email: targetEmail });
    const existingCand = await Candidate.findOne({ email: targetEmail });
    if (existingCEO || existingCand) {
      return res.status(400).json({ error: "Email already registered in system." });
    }

    const otp = generateOtp();
    let request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request) {
      request = new OnboardingRequest({ email: targetEmail });
    }
    
    // Reset flags if starting a new signup/retry
    request.emailOtp = otp;
    request.isEmailVerified = false;
    request.status = "Pending";
    await request.save();

    await sendEmailOtp(targetEmail, otp);
    return res.json({ success: true, message: "Verification OTP code sent to your email." });
  } catch (err) {
    console.error("[register-step1-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// Step 1 Verify: Verify Email OTP
router.post("/verify-step1-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
    const targetEmail = email.toLowerCase().trim();

    const request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request) return res.status(404).json({ error: "Registration session not found." });

    if (request.emailOtp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP verification code." });
    }

    request.isEmailVerified = true;
    request.emailOtp = null; // Clear OTP
    await request.save();

    return res.json({ success: true, message: "Email verified successfully." });
  } catch (err) {
    console.error("[verify-step1-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Step 2: Enter Mobile & Send WhatsApp OTP
router.post("/register-step2-mobile", async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email || !mobile) return res.status(400).json({ error: "Email and mobile number are required" });
    const targetEmail = email.toLowerCase().trim();

    const request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request || !request.isEmailVerified) {
      return res.status(400).json({ error: "Please verify your email address first." });
    }

    const otp = generateOtp();
    request.mobile = mobile.trim();
    request.mobileOtp = otp;
    request.isMobileVerified = false;
    await request.save();

    await sendWhatsAppOtp(mobile, otp);
    return res.json({ success: true, message: "Verification OTP code sent to your WhatsApp number." });
  } catch (err) {
    console.error("[register-step2-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// Step 2 Verify: Verify WhatsApp OTP
router.post("/verify-step2-mobile", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
    const targetEmail = email.toLowerCase().trim();

    const request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request) return res.status(404).json({ error: "Registration session not found." });

    if (request.mobileOtp !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP verification code." });
    }

    request.isMobileVerified = true;
    request.mobileOtp = null; // Clear OTP
    await request.save();

    return res.json({ success: true, message: "Mobile number verified successfully." });
  } catch (err) {
    console.error("[verify-step2-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Step 3: Profile Data Form Submission
router.post("/register-step3-profile", async (req, res) => {
  try {
    const {
      email,
      name,
      organizationName,
      designation,
      address,
      city,
      pincode,
      description,
      password,
      googleId
    } = req.body;

    if (!email || !name || !organizationName || !designation || !address || !description) {
      return res.status(400).json({ error: "Missing required profile fields." });
    }
    const targetEmail = email.toLowerCase().trim();

    const request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request || !request.isEmailVerified || !request.isMobileVerified) {
      return res.status(400).json({ error: "Please complete Email and Mobile OTP verifications first." });
    }

    // Word count validation for description: max 30 words
    const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) {
      return res.status(400).json({ error: "Description must not exceed 30 words." });
    }

    request.name = name.trim();
    request.organizationName = organizationName.trim();
    request.designation = designation.trim();
    request.address = address.trim();
    request.city = city ? city.trim() : "";
    request.pincode = pincode ? pincode.trim() : "";
    request.description = description.trim();
    
    if (googleId) {
      request.googleId = googleId;
    }
    if (password) {
      request.passwordHash = await hashPassword(password);
    }

    await request.save();
    return res.json({ success: true, message: "Profile details saved successfully. Proceed to photo upload." });
  } catch (err) {
    console.error("[register-step3-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Step 4: Profile Image Upload & Finalize Submission
router.post("/register-step4-photo", photoUpload, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const targetEmail = email.toLowerCase().trim();

    const request = await OnboardingRequest.findOne({ email: targetEmail });
    if (!request || !request.isEmailVerified || !request.isMobileVerified) {
      return res.status(400).json({ error: "Registration session not found or verification not completed." });
    }

    const photoFile = req.files?.photo?.[0];
    if (photoFile) {
      if (!isR2Configured()) {
        return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      }
      const uploaded = await uploadToR2(photoFile, "onboarding/photos");
      request.photoUrl = uploaded.url;
      request.photoKey = uploaded.key;
    }

    request.status = "Pending";
    await request.save();

    return res.json({
      success: true,
      message: "Your onboarding registration request has been submitted successfully. Admin will review and approve your account shortly.",
      request
    });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") {
      return res.status(400).json({ error: "Invalid photo file type. Only standard formats (jpg, png, webp) are allowed." });
    }
    console.error("[register-step4-error]", err);
    return res.status(500).json({ 
      error: "INTERNAL_ERROR", 
      message: err.message,
      stack: err.stack 
    });
  }
});

// ── POST Forgot Password (Send OTP) ──────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const targetEmail = email.toLowerCase().trim();

    const ceo = await CEO.findOne({ email: targetEmail });
    if (!ceo) {
      console.log(`[Forgot Password] Requested email not found: ${targetEmail}`);
      return res.json({ success: true, message: "If the email is registered, a password reset code has been sent." });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    ceo.resetOtp = otpCode;
    ceo.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await ceo.save();

    // Send OTP via utility
    const { sendEmailOtp } = require("../utils/otp");
    await sendEmailOtp(targetEmail, otpCode);

    return res.json({ success: true, message: "Verification OTP code sent to your email." });
  } catch (err) {
    console.error("[forgot-password-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── POST Reset Password (Verify OTP & Update) ───────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }
    const targetEmail = email.toLowerCase().trim();

    const ceo = await CEO.findOne({
      email: targetEmail,
      resetOtp: otp.trim(),
      resetOtpExpires: { $gt: new Date() }
    });

    if (!ceo) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Update password
    const { hashPassword } = require("../utils/password");
    ceo.passwordHash = await hashPassword(newPassword);
    
    // Clear OTP fields
    ceo.resetOtp = undefined;
    ceo.resetOtpExpires = undefined;
    await ceo.save();

    return res.json({ success: true, message: "Password reset successfully. You can now login with your new password." });
  } catch (err) {
    console.error("[reset-password-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = { authRouter: router };

