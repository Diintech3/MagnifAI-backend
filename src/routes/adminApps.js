const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { App, toPublicApp } = require("../models/App");
const { hashPassword } = require("../utils/password");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { logoUpload } = require("../middleware/upload");
const { signAccessToken } = require("../utils/jwt");

const router = express.Router();

const emptyToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalPassword = z.preprocess(emptyToUndefined, z.string().min(10).optional());

function appFilter(req) {
  if (req.user.role === "SUPERADMIN") return {};
  return { createdBy: req.user.sub };
}

const createAppSchema = z
  .object({
    businessName: z.string().trim().min(1),
    websiteUrl: z.string().trim().optional(),
    gstNumber: z.string().trim().optional(),
    panNumber: z.string().trim().optional(),
    fullName: z.string().trim().min(1),
    email: z.string().email(),
    mobile: z.string().trim().min(8),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    linkedAppId: z.string().trim().optional(),
    password: z.string().min(10),
    confirmPassword: z.string().min(10),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

/** Apps list for Account Security dropdown (only apps you already created) */
router.get("/dropdown", async (req, res) => {
  const filter = appFilter(req);
  const exclude = typeof req.query.exclude === "string" ? req.query.exclude : "";

  if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
    filter._id = { $ne: exclude };
  }

  const docs = await App.find(filter).select("businessName").sort({ businessName: 1 });
  return res.json({
    apps: docs.map((d) => ({ id: d._id.toString(), businessName: d.businessName })),
  });
});

router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = appFilter(req);

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { businessName: regex },
      { email: regex },
      { fullName: regex },
      { mobile: regex },
      { gstNumber: regex },
      { panNumber: regex },
    ];
  }

  const docs = await App.find(filter).populate("linkedAppId", "businessName").sort({ createdAt: -1 });
  return res.json({ apps: docs.map(toPublicApp) });
});

async function resolveLinkedAppId(linkedAppId, req) {
  if (!linkedAppId || linkedAppId === "") return null;
  if (!mongoose.Types.ObjectId.isValid(linkedAppId)) return null;
  const linked = await App.findOne({ _id: linkedAppId, ...appFilter(req) });
  if (!linked) return null;
  return linked._id;
}

router.post("/", logoUpload.single("logo"), async (req, res) => {
  try {
    const parsed = createAppSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.message === "PASSWORD_MISMATCH") {
        return res.status(400).json({ error: "PASSWORD_MISMATCH" });
      }
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await App.findOne({ email });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });

    const linkedAppId = await resolveLinkedAppId(parsed.data.linkedAppId, req);

    let logoUrl;
    let logoKey;
    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file);
      logoUrl = uploaded.url;
      logoKey = uploaded.key;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await App.create({
      businessName: parsed.data.businessName,
      websiteUrl: parsed.data.websiteUrl,
      gstNumber: parsed.data.gstNumber,
      panNumber: parsed.data.panNumber,
      logoUrl,
      logoKey,
      fullName: parsed.data.fullName,
      email,
      mobile: parsed.data.mobile,
      city: parsed.data.city,
      address: parsed.data.address,
      pincode: parsed.data.pincode,
      linkedAppId,
      passwordHash,
      createdBy: req.user.sub,
      source: "Direct",
      agentsCount: 0,
      isActive: true,
    });

    const populated = await App.findById(created._id).populate("linkedAppId", "businessName");
    return res.status(201).json({ app: toPublicApp(populated) });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") {
      return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    }
    if (err.message === "R2_NOT_CONFIGURED") {
      return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    }
    throw err;
  }
});

router.patch("/:id", logoUpload.single("logo"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const app = await App.findOne({ _id: params.data.id, ...appFilter(req) });
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const body = z
    .object({
      businessName: z.string().trim().min(1).optional(),
      websiteUrl: z.string().trim().optional(),
      gstNumber: z.string().trim().optional(),
      panNumber: z.string().trim().optional(),
      fullName: z.string().trim().min(1).optional(),
      email: z.string().email().optional(),
      mobile: z.string().trim().min(8).optional(),
      city: z.string().trim().optional(),
      address: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
      linkedAppId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
      password: optionalPassword,
      confirmPassword: optionalPassword,
      isActive: z.coerce.boolean().optional(),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  if (body.data.password && body.data.password !== body.data.confirmPassword) {
    return res.status(400).json({ error: "PASSWORD_MISMATCH" });
  }

  if (body.data.email) {
    const email = body.data.email.toLowerCase();
    const existing = await App.findOne({ email, _id: { $ne: app._id } });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    app.email = email;
  }

  const fields = [
    "businessName",
    "websiteUrl",
    "gstNumber",
    "panNumber",
    "fullName",
    "mobile",
    "city",
    "address",
    "pincode",
    "isActive",
  ];
  for (const f of fields) {
    if (body.data[f] !== undefined) app[f] = body.data[f];
  }

  if (body.data.linkedAppId !== undefined) {
    app.linkedAppId = await resolveLinkedAppId(body.data.linkedAppId, req);
  }

  if (body.data.password) app.passwordHash = await hashPassword(body.data.password);

  if (req.file) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    const uploaded = await uploadToR2(req.file);
    app.logoUrl = uploaded.url;
    app.logoKey = uploaded.key;
  }

  await app.save();
  const populated = await App.findById(app._id).populate("linkedAppId", "businessName");
  return res.json({ app: toPublicApp(populated) });
});

router.post("/:id/login-as", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const app = await App.findOne({ _id: params.data.id, ...appFilter(req) }).populate(
    "linkedAppId",
    "businessName",
  );
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  if (!app.isActive) return res.status(403).json({ error: "APP_DISABLED" });

  const publicApp = toPublicApp(app);
  const accessToken = signAccessToken({
    sub: publicApp.id,
    email: publicApp.email,
    role: "APP",
    name: publicApp.businessName,
    businessName: publicApp.businessName,
  });

  return res.json({
    accessToken,
    user: {
      id: publicApp.id,
      email: publicApp.email,
      role: "APP",
      name: publicApp.businessName,
      businessName: publicApp.businessName,
    },
    app: publicApp,
  });
});

router.delete("/:id", async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const deleted = await App.findOneAndDelete({ _id: params.data.id, ...appFilter(req) });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

module.exports = { adminAppsRouter: router };
