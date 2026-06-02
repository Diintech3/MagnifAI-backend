const express = require("express");
const { z } = require("zod");
const { App } = require("../models/App");
const { Candidate, toPublicCandidate, ASSEMBLIES } = require("../models/Candidate");
const { hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { candidateUpload } = require("../middleware/upload");

const router = express.Router();

const emptyToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalPassword = z.preprocess(emptyToUndefined, z.string().min(10).optional());

async function getAppForUser(req) {
  return App.findById(req.user.sub);
}

const createSchema = z
  .object({
    name: z.string().trim().min(1),
    partyName: z.string().trim().min(1),
    constituency: z.string().trim().min(1),
    assembly: z.enum(ASSEMBLIES),
    address: z.string().trim().optional(),
    email: z.string().email(),
    mobile: z.string().trim().min(8),
    password: z.string().min(10),
    confirmPassword: z.string().min(10),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  partyName: z.string().trim().min(1).optional(),
  constituency: z.string().trim().min(1).optional(),
  assembly: z.enum(ASSEMBLIES).optional(),
  address: z.string().trim().optional(),
  email: z.string().email().optional(),
  mobile: z.string().trim().min(8).optional(),
  password: optionalPassword,
  confirmPassword: optionalPassword,
});

router.get("/", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = { appId: app._id };

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: regex },
      { partyName: regex },
      { constituency: regex },
      { email: regex },
      { mobile: regex },
      { assembly: regex },
    ];
  }

  const docs = await Candidate.find(filter).sort({ createdAt: -1 });
  return res.json({ candidates: docs.map(toPublicCandidate) });
});

router.post("/", candidateUpload, async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.message === "PASSWORD_MISMATCH") {
        return res.status(400).json({ error: "PASSWORD_MISMATCH" });
      }
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await Candidate.findOne({ email });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });

    let partyLogoUrl;
    let partyLogoKey;
    let photoUrl;
    let photoKey;

    const partyFile = req.files?.partyLogo?.[0];
    const photoFile = req.files?.photo?.[0];

    if (partyFile || photoFile) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    }

    if (partyFile) {
      const uploaded = await uploadToR2(partyFile, "candidates/party-logos");
      partyLogoUrl = uploaded.url;
      partyLogoKey = uploaded.key;
    }

    if (photoFile) {
      const uploaded = await uploadToR2(photoFile, "candidates/photos");
      photoUrl = uploaded.url;
      photoKey = uploaded.key;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await Candidate.create({
      appId: app._id,
      name: parsed.data.name,
      partyName: parsed.data.partyName,
      partyLogoUrl,
      partyLogoKey,
      constituency: parsed.data.constituency,
      assembly: parsed.data.assembly,
      address: parsed.data.address,
      email,
      mobile: parsed.data.mobile,
      passwordHash,
      photoUrl,
      photoKey,
    });

    return res.status(201).json({ candidate: toPublicCandidate(created) });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    if (err.message === "R2_NOT_CONFIGURED") return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    throw err;
  }
});

router.post("/:id/login-as", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const candidate = await Candidate.findOne({ _id: req.params.id, appId: app._id });
  if (!candidate) return res.status(404).json({ error: "NOT_FOUND" });
  if (!candidate.isActive) return res.status(403).json({ error: "CANDIDATE_DISABLED" });
  if (!candidate.passwordHash) {
    return res.status(403).json({ error: "CANDIDATE_PASSWORD_NOT_SET" });
  }

  const publicCandidate = toPublicCandidate(candidate);
  const accessToken = signAccessToken({
    sub: publicCandidate.id,
    email: publicCandidate.email,
    role: "CANDIDATE",
    name: publicCandidate.name,
    constituency: publicCandidate.constituency,
    assembly: publicCandidate.assembly,
  });

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
});

router.patch("/:id", candidateUpload, async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const candidate = await Candidate.findOne({ _id: req.params.id, appId: app._id });
  if (!candidate) return res.status(404).json({ error: "NOT_FOUND" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  if (parsed.data.password && parsed.data.password !== parsed.data.confirmPassword) {
    return res.status(400).json({ error: "PASSWORD_MISMATCH" });
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    const existing = await Candidate.findOne({ email, _id: { $ne: candidate._id } });
    if (existing) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    candidate.email = email;
  }

  const fields = ["name", "partyName", "constituency", "assembly", "address", "mobile"];
  for (const f of fields) {
    if (parsed.data[f] !== undefined) candidate[f] = parsed.data[f];
  }

  if (parsed.data.password) candidate.passwordHash = await hashPassword(parsed.data.password);

  const partyFile = req.files?.partyLogo?.[0];
  const photoFile = req.files?.photo?.[0];

  if (partyFile || photoFile) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
  }

  if (partyFile) {
    const uploaded = await uploadToR2(partyFile, "candidates/party-logos");
    candidate.partyLogoUrl = uploaded.url;
    candidate.partyLogoKey = uploaded.key;
  }

  if (photoFile) {
    const uploaded = await uploadToR2(photoFile, "candidates/photos");
    candidate.photoUrl = uploaded.url;
    candidate.photoKey = uploaded.key;
  }

  await candidate.save();
  return res.json({ candidate: toPublicCandidate(candidate) });
});

router.delete("/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const deleted = await Candidate.findOneAndDelete({ _id: req.params.id, appId: app._id });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

module.exports = { candidatesRouter: router };
