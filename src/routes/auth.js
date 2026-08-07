const express = require("express");
const { z } = require("zod");
const { User, toPublicUser } = require("../models/User");
const { App, toPublicApp } = require("../models/App");
const { Candidate, toPublicCandidate } = require("../models/Candidate");
const { CEO, toPublicCEO } = require("../models/CEO");
const { verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { requireAuth, requireRole } = require("../middleware/auth");

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

module.exports = { authRouter: router };

