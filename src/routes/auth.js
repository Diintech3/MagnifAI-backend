const express = require("express");
const { z } = require("zod");
const { User, toPublicUser } = require("../models/User");
const { App, toPublicApp } = require("../models/App");
const { Candidate, toPublicCandidate } = require("../models/Candidate");
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

router.get("/me", requireAuth, requireRole("SUPERADMIN", "ADMIN"), async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user || !user.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const publicUser = toPublicUser(user);
  return res.json({
    id: publicUser.id,
    email: publicUser.email,
    role: publicUser.role,
    name: publicUser.name,
  });
});

router.get("/app/me", requireAuth, requireRole("APP"), async (req, res) => {
  const app = await App.findById(req.user.sub).populate("linkedAppId", "businessName");
  if (!app || !app.isActive) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const publicApp = toPublicApp(app);
  return res.json({
    id: publicApp.id,
    email: publicApp.email,
    role: "APP",
    name: publicApp.businessName,
    businessName: publicApp.businessName,
    showCandidates: app.showCandidates ?? false,
    app: publicApp,
  });
});

router.get("/candidate/me", requireAuth, requireRole("CANDIDATE"), async (req, res) => {
  const candidate = await Candidate.findById(req.user.sub);
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
  });
});

module.exports = { authRouter: router };
