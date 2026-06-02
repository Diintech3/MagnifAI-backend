const express = require("express");
const { z } = require("zod");
const { User, toPublicUser } = require("../models/User");
const { App } = require("../models/App");
const { hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");

const router = express.Router();

router.get("/overview", async (_req, res) => {
  const [totalAdmins, activeAdmins, inactiveAdmins, totalApps, activeApps] = await Promise.all([
    User.countDocuments({ role: "ADMIN" }),
    User.countDocuments({ role: "ADMIN", isActive: true }),
    User.countDocuments({ role: "ADMIN", isActive: false }),
    App.countDocuments(),
    App.countDocuments({ isActive: true }),
  ]);

  return res.json({
    totalAdmins,
    activeAdmins,
    inactiveAdmins,
    totalApps,
    activeApps,
  });
});

router.get("/admins", async (_req, res) => {
  const docs = await User.find({ role: "ADMIN" }).sort({ createdAt: -1 });
  const admins = docs.map(toPublicUser);
  return res.json({ admins });
});

router.post("/admins", async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      name: z.string().min(1).optional(),
      password: z.string().min(10),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const existing = await User.findOne({ email: body.data.email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });

  const passwordHash = await hashPassword(body.data.password);
  const created = await User.create({
    email: body.data.email.toLowerCase(),
    name: body.data.name,
    passwordHash,
    role: "ADMIN",
    isActive: true,
  });

  const admin = toPublicUser(created);
  return res.status(201).json({ admin });
});

router.patch("/admins/:id/status", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  const body = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const updated = await User.findByIdAndUpdate(
    params.data.id,
    { isActive: body.data.isActive },
    { new: true },
  );
  if (!updated || updated.role !== "ADMIN") return res.status(404).json({ error: "NOT_FOUND" });

  const admin = toPublicUser(updated);
  return res.json({
    admin: { id: admin.id, email: admin.email, isActive: admin.isActive },
  });
});

router.patch("/admins/:id", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  const body = z
    .object({
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      password: z.string().min(10).optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const admin = await User.findById(params.data.id);
  if (!admin || admin.role !== "ADMIN") return res.status(404).json({ error: "NOT_FOUND" });

  if (body.data.email) {
    const email = body.data.email.toLowerCase();
    const existing = await User.findOne({ email, _id: { $ne: admin._id } });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    admin.email = email;
  }
  if (body.data.name !== undefined) admin.name = body.data.name;
  if (body.data.password) admin.passwordHash = await hashPassword(body.data.password);
  if (body.data.isActive !== undefined) admin.isActive = body.data.isActive;

  await admin.save();
  return res.json({ admin: toPublicUser(admin) });
});

router.delete("/admins/:id", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const deleted = await User.findOneAndDelete({ _id: params.data.id, role: "ADMIN" });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

router.post("/admins/:id/login-as", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const admin = await User.findById(params.data.id);
  if (!admin || admin.role !== "ADMIN") return res.status(404).json({ error: "NOT_FOUND" });
  if (!admin.isActive) return res.status(403).json({ error: "ADMIN_DISABLED" });

  const publicUser = toPublicUser(admin);
  const accessToken = signAccessToken({
    sub: publicUser.id,
    email: publicUser.email,
    role: publicUser.role,
    name: publicUser.name,
  });

  return res.json({
    accessToken,
    user: {
      id: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      name: publicUser.name,
    },
  });
});

module.exports = { superadminRouter: router };
