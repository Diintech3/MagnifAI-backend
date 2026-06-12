const express = require("express");
const { CeoProfile } = require("../models/CeoProfile");
const { PromptLibrary } = require("../models/PromptLibrary");
const { App } = require("../models/App");

const router = express.Router();

async function getApp(req) {
  if (req.user.appId) return App.findById(req.user.appId);
  return App.findById(req.user.sub);
}

// ── CEO Profiles ──────────────────────────────────────────────────────────────

// GET all CEO profiles for this app
router.get("/ceos", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceos = await CeoProfile.find({ appId: app._id, isActive: true }).sort({ createdAt: -1 });
  return res.json({ ceos });
});

// GET single CEO profile
router.get("/ceos/:id", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CeoProfile.findOne({ _id: req.params.id, appId: app._id });
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ceo });
});

// POST create CEO profile
router.post("/ceos", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { name, company, website, industry, country, email, phone, biography, vision, mission,
          achievements, awards, products, services, brandVoice, targetAudience,
          keywords, competitors, contentGoals, social, aiMemory } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const ceo = await CeoProfile.create({
    appId: app._id, name, company, website, industry, country, email, phone,
    biography, vision, mission, achievements, awards, products, services,
    brandVoice, targetAudience, keywords, competitors, contentGoals, social, aiMemory,
  });
  return res.status(201).json({ ceo });
});

// PATCH update CEO profile
router.patch("/ceos/:id", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CeoProfile.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: req.body },
    { new: true }
  );
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ceo });
});

// DELETE CEO profile
router.delete("/ceos/:id", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  await CeoProfile.findOneAndUpdate({ _id: req.params.id, appId: app._id }, { $set: { isActive: false } });
  return res.json({ ok: true });
});

// ── Prompt Library ────────────────────────────────────────────────────────────

// GET prompts — optionally filter by contentType
router.get("/prompts", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const filter = { appId: app._id };
  if (req.query.contentType) filter.contentType = req.query.contentType;
  const prompts = await PromptLibrary.find(filter).sort({ usageCount: -1, createdAt: -1 });
  return res.json({ prompts });
});

// POST create prompt
router.post("/prompts", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { contentType, title, prompt, description, tags } = req.body;
  if (!contentType || !title || !prompt) return res.status(400).json({ error: "contentType, title, prompt required" });
  const doc = await PromptLibrary.create({ appId: app._id, contentType, title, prompt, description, tags });
  return res.status(201).json({ prompt: doc });
});

// PATCH update prompt
router.patch("/prompts/:id", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const doc = await PromptLibrary.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: req.body },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ prompt: doc });
});

// PATCH increment usage count
router.patch("/prompts/:id/use", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const doc = await PromptLibrary.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $inc: { usageCount: 1 } },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ prompt: doc });
});

// DELETE prompt
router.delete("/prompts/:id", async (req, res) => {
  const app = await getApp(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  await PromptLibrary.findOneAndDelete({ _id: req.params.id, appId: app._id });
  return res.json({ ok: true });
});

module.exports = { ceoWorkspaceRouter: router };
