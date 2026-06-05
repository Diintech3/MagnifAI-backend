const express = require("express");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { candidatesRouter } = require("./candidates");

const router = express.Router();

async function getAppForUser(req) {
  return App.findById(req.user.sub);
}

router.get("/overview", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const totalCandidates = await Candidate.countDocuments({ appId: app._id });

  return res.json({
    businessName: app.businessName,
    email: app.email,
    mobile: app.mobile,
    website: app.websiteUrl,
    city: app.city,
    isActive: app.isActive,
    totalCandidates,
    agentsCount: app.agentsCount ?? 0,
  });
});

// Social media — placeholder (no live integration yet)
router.get("/social/:platform", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  // Return empty structure so frontend renders the "not connected" state
  return res.json({
    platform,
    followers: null,
    totalLikes: null,
    totalComments: null,
    totalReach: null,
    posts: [],
  });
});

// News — uses NEWS_API_KEY if available, otherwise returns empty
router.get("/news", async (req, res) => {
  const category = req.query.category || "All";
  const search   = req.query.search   || "";

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return res.json({ articles: [], message: "NEWS_API_KEY not configured" });
  }

  try {
    const q = search.trim() || (category !== "All" ? category : "India election politics");
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const articles = (data.articles || []).map((a) => ({
      id:          a.url,
      title:       a.title,
      description: a.description,
      url:         a.url,
      imageUrl:    a.urlToImage,
      source:      a.source?.name,
      publishedAt: a.publishedAt,
      category:    category !== "All" ? category : undefined,
    }));

    return res.json({ articles });
  } catch (e) {
    return res.json({ articles: [], message: "Failed to fetch news" });
  }
});

// Digital mentions — placeholder
router.get("/digital-mentions", async (req, res) => {
  return res.json({
    positive: 0,
    negative: 0,
    neutral:  0,
    mentions: [],
    message:  "Digital mentions integration coming soon.",
  });
});

router.use("/candidates", candidatesRouter);

module.exports = { appPortalRouter: router };
