const express = require("express");
const { z } = require("zod");
const { getSocialMediaData } = require("../services/socialMediaService");
const { getDigitalMentions } = require("../services/digitalMentionsService");
const { CandidateSocialLink } = require("../models/CandidateSocialLink");
const { env } = require("../config/env");

const router = express.Router();

/* ─── Social Media — live data for a candidate ──────────── */
// GET /api/admin/social-data/social?stateCode=UP&bodyType=VIDHAN_SABHA&year=2022&seatNo=1&candidateName=Umar+Ali+Khan
router.get("/social", async (req, res) => {
  const { stateCode, bodyType, year, seatNo, candidateName } = req.query;
  try {
    const data = await getSocialMediaData({ stateCode, bodyType, year, seatNo, candidateName });
    return res.json(data);
  } catch (err) {
    console.error("[social-data/social]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/* ─── Digital Mentions ───────────────────────────────────── */
// GET /api/admin/social-data/mentions?seatName=Behat&state=Uttar+Pradesh&winnerName=Umar+Ali+Khan
router.get("/mentions", async (req, res) => {
  const { seatName, state = "Uttar Pradesh", winnerName = "" } = req.query;
  if (!seatName) return res.status(400).json({ error: "seatName is required" });
  try {
    const data = await getDigitalMentions(seatName, state, winnerName);
    return res.json(data);
  } catch (err) {
    console.error("[social-data/mentions]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/* ─── CandidateSocialLink CRUD ───────────────────────────── */

const linkSchema = z.object({
  stateCode:     z.string().trim().min(1).default("UP"),
  bodyType:      z.string().trim().min(1).default("VIDHAN_SABHA"),
  year:          z.string().trim().min(4),
  seatNo:        z.coerce.number().int().positive(),
  seatName:      z.string().trim().min(1),
  candidateName: z.string().trim().min(1),
  instagram: z.object({
    igUserId:   z.string().trim().default(""),
    handle:     z.string().trim().default(""),
    profileUrl: z.string().trim().default(""),
  }).optional().default({}),
  facebook: z.object({
    pageId:     z.string().trim().default(""),
    handle:     z.string().trim().default(""),
    profileUrl: z.string().trim().default(""),
  }).optional().default({}),
  youtube: z.object({
    channelId:  z.string().trim().default(""),
    handle:     z.string().trim().default(""),
    profileUrl: z.string().trim().default(""),
  }).optional().default({}),
  twitter: z.object({
    handle:     z.string().trim().default(""),
    profileUrl: z.string().trim().default(""),
  }).optional().default({}),
  threads: z.object({
    handle:     z.string().trim().default(""),
    profileUrl: z.string().trim().default(""),
  }).optional().default({}),
});

// GET /api/admin/social-data/links?stateCode=UP&bodyType=VIDHAN_SABHA&year=2022&seatNo=1
router.get("/links", async (req, res) => {
  const { stateCode = "UP", bodyType = "VIDHAN_SABHA", year = "2022", seatNo } = req.query;
  const filter = {
    stateCode: stateCode.toUpperCase(),
    bodyType:  bodyType.toUpperCase(),
    year:      String(year),
  };
  if (seatNo) filter.seatNo = Number(seatNo);
  try {
    const links = await CandidateSocialLink.find(filter).sort({ candidateName: 1 });
    return res.json({ links });
  } catch (err) {
    console.error("[social-data/links GET]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// POST /api/admin/social-data/links — create or update (upsert)
router.post("/links", async (req, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues });

  const d = parsed.data;
  try {
    const filter = {
      stateCode:     d.stateCode.toUpperCase(),
      bodyType:      d.bodyType.toUpperCase(),
      year:          d.year,
      seatNo:        d.seatNo,
      candidateName: d.candidateName,
    };
    const update = {
      ...filter,
      seatName:   d.seatName,
      instagram:  d.instagram,
      facebook:   d.facebook,
      youtube:    d.youtube,
      twitter:    d.twitter,
      threads:    d.threads,
      createdBy:  req.user?.sub || null,
    };
    const link = await CandidateSocialLink.findOneAndUpdate(
      filter, update, { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json({ link });
  } catch (err) {
    console.error("[social-data/links POST]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// DELETE /api/admin/social-data/links/:id
router.delete("/links/:id", async (req, res) => {
  try {
    const deleted = await CandidateSocialLink.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[social-data/links DELETE]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// GET /api/admin/social-data/status
router.get("/status", (_req, res) => {
  return res.json({
    instagram: { configured: !!(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_USER_ID) },
    newsApi:   { configured: !!env.NEWS_API_KEY },
  });
});

module.exports = { socialDataRouter: router };
