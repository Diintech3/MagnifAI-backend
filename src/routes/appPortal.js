const express = require("express");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { Campaign } = require("../models/Campaign");
const { candidatesRouter } = require("./candidates");
const { postsRouter } = require("./posts");

const router = express.Router();

async function getAppForUser(req) {
  return App.findById(req.user.sub);
}

// Fetch live Instagram stats via Meta Graph API
async function fetchInstagramLive(creds) {
  const username = creds.username?.replace(/^@/, "");
  if (!username) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const ownUserId = process.env.INSTAGRAM_USER_ID;
  if (!accessToken || !ownUserId) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const FB_BASE = "https://graph.facebook.com/v25.0";

  try {
    // Check if it's the owner's own account
    const ownRes = await fetch(`${FB_BASE}/${ownUserId}?fields=username&access_token=${accessToken}`);
    const ownData = await ownRes.json();
    const isOwnAccount = ownData.username?.toLowerCase() === username.toLowerCase();

    if (isOwnAccount) {
      // Fetch own account full stats
      const profileRes = await fetch(`${FB_BASE}/${ownUserId}?fields=followers_count,media_count&access_token=${accessToken}`);
      const profile = await profileRes.json();

      const mediaRes = await fetch(`${FB_BASE}/${ownUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=12&access_token=${accessToken}`);
      const mediaData = await mediaRes.json();
      const posts = (mediaData.data || []).map((p) => ({
        id: p.id,
        caption: p.caption || "",
        thumbnailUrl: p.media_url || p.thumbnail_url || null,
        likes: p.like_count ?? 0,
        comments: p.comments_count ?? 0,
        shares: 0, reach: 0,
        date: p.timestamp,
        url: p.permalink,
      }));

      return {
        followers: profile.followers_count ?? null,
        totalLikes: posts.reduce((s, p) => s + p.likes, 0),
        totalComments: posts.reduce((s, p) => s + p.comments, 0),
        totalReach: null,
        posts,
      };
    } else {
      // Try Business Discovery for other Business/Creator accounts
      const bdRes = await fetch(
        `${FB_BASE}/${ownUserId}?fields=business_discovery.fields(id,username,followers_count,media_count,media{caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count})&username=${encodeURIComponent(username)}&access_token=${accessToken}`
      );
      const bdData = await bdRes.json();
      const bd = bdData?.business_discovery;

      if (bd?.id) {
        const posts = (bd.media?.data || []).map((p) => ({
          id: p.id,
          caption: p.caption || "",
          thumbnailUrl: p.media_url || p.thumbnail_url || null,
          likes: p.like_count ?? 0,
          comments: p.comments_count ?? 0,
          shares: 0, reach: 0,
          date: p.timestamp,
          url: p.permalink,
        }));
        return {
          followers: bd.followers_count ?? null,
          totalLikes: posts.reduce((s, p) => s + p.likes, 0),
          totalComments: posts.reduce((s, p) => s + p.comments, 0),
          totalReach: null,
          posts,
        };
      }

      // Personal account — return profile link only
      return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [], profileUrl: `https://www.instagram.com/${username}/` };
    }
  } catch (e) {
    console.error("[ig-live]", e.message);
    return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };
  }
}

router.patch("/profile", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { businessName, fullName, mobile, websiteUrl, city, address, pincode } = req.body || {};
  if (businessName) app.businessName = businessName;
  if (fullName)     app.fullName = fullName;
  if (mobile)       app.mobile = mobile;
  if (websiteUrl !== undefined) app.websiteUrl = websiteUrl;
  if (city !== undefined)       app.city = city;
  if (address !== undefined)    app.address = address;
  if (pincode !== undefined)    app.pincode = pincode;
  await app.save();
  return res.json({ ok: true });
});

router.get("/overview", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const totalCandidates = await Candidate.countDocuments({ appId: app._id });

  return res.json({
    businessName: app.businessName,
    fullName:     app.fullName,
    email:        app.email,
    mobile:       app.mobile,
    website:      app.websiteUrl,
    city:         app.city,
    address:      app.address,
    pincode:      app.pincode,
    isActive:     app.isActive,
    totalCandidates,
    agentsCount:  app.agentsCount ?? 0,
  });
});

// Social media — get credentials + live stats
router.get("/social/:platform", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const app = await getAppForUser(req);
  const creds = app?.social?.[platform] || {};
  const isConnected = Object.values(creds).some(Boolean);

  let liveData = { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };
  if (isConnected && platform === "instagram") {
    liveData = await fetchInstagramLive(creds);
  }

  return res.json({
    platform,
    isConnected,
    credentials: creds,
    ...liveData,
  });
});

// Social media — save credentials (resolve Instagram userId from username)
router.post("/social/:platform/connect", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  let fields = req.body || {};

  // For Instagram: just clean and save username directly (no API resolve needed)
  if (platform === "instagram" && fields.username) {
    const handle = fields.username.replace(/^@/, "");
    fields = { username: `@${handle}` };
  }

  if (!app.social) app.social = {};
  app.social[platform] = { ...(app.social[platform] || {}), ...fields };
  app.markModified("social");
  await app.save();

  return res.json({ ok: true, credentials: app.social[platform] });
});

// Social media — disconnect
router.delete("/social/:platform/connect", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  if (app.social) { app.social[platform] = {}; app.markModified("social"); }
  await app.save();
  return res.json({ ok: true });
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
router.use("/posts", postsRouter);

// ── Campaigns ──────────────────────────────────────────────
router.get("/campaigns", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const campaigns = await Campaign.find({ appId: app._id }).sort({ createdAt: -1 });
  return res.json({ campaigns });
});

router.post("/campaigns", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { name, description, status, goal, startDate, endDate } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const campaign = await Campaign.create({ appId: app._id, name, description, status, goal, startDate, endDate });
  return res.status(201).json({ campaign });
});

router.patch("/campaigns/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: req.body },
    { new: true }
  );
  if (!campaign) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ campaign });
});

router.delete("/campaigns/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  await Campaign.findOneAndDelete({ _id: req.params.id, appId: app._id });
  return res.json({ ok: true });
});

// ── AI Chat (HelloPaai) ────────────────────────────────────
router.post("/ai/chat", async (req, res) => {
  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI not configured" });

  try {
    const messages = [
      { role: "system", content: "You are HelloPaai, an AI assistant for political campaign management. Help users write speeches, social media posts, press releases, campaign strategies, and other campaign-related content. Be concise, professional, and helpful." },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: 1024 }),
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return res.json({ reply });
  } catch (e) {
    console.error("[ai-chat]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
});

module.exports = { appPortalRouter: router };
