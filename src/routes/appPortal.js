const express = require("express");
const { z } = require("zod");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { Campaign } = require("../models/Campaign");
const { CEO, toPublicCEO } = require("../models/CEO");
const { hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { candidateUpload } = require("../middleware/upload");
const { candidatesRouter } = require("./candidates");
const { postsRouter } = require("./posts");

const router = express.Router();

async function getAppForUser(req) {
  // Normal App login: sub is App._id
  if (req.user.appId) {
    // CEO login-as: sub is CEO._id, appId is parent App._id
    return App.findById(req.user.appId);
  }
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
  const isCEO = Boolean(req.user.appId);
  if (isCEO) {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
    const { fullName, mobile } = req.body || {};
    if (fullName) ceo.name   = fullName;
    if (mobile)   ceo.mobile = mobile;
    await ceo.save();
    return res.json({ ok: true });
  }
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
  const isCEO = Boolean(req.user.appId);
  if (isCEO) {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({
      businessName: ceo.name,
      fullName:     ceo.name,
      email:        ceo.email,
      mobile:       ceo.mobile,
      website:      ceo.website || null,
      city:         ceo.city || null,
      address:      ceo.address || null,
      pincode:      ceo.pincode || null,
      isActive:     ceo.isActive,
      totalCandidates: 0,
      agentsCount:  0,
    });
  }
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

// ── CEO (Founder Dashboard) ───────────────────────────────────────────────────

const ceoCreateSchema = z.object({
  name:        z.string().trim().min(1),
  company:     z.string().trim().optional(),
  industry:    z.string().trim().optional(),
  designation: z.string().trim().optional(),
  website:     z.string().trim().optional(),
  city:        z.string().trim().optional(),
  address:     z.string().trim().optional(),
  pincode:     z.string().trim().optional(),
  email:       z.string().email(),
  mobile:      z.string().trim().min(8),
  password:    z.string().min(10),
  confirmPassword: z.string().min(10),
}).refine(d => d.password === d.confirmPassword, { message: "PASSWORD_MISMATCH", path: ["confirmPassword"] });

const ceoUpdateSchema = z.object({
  name:        z.string().trim().min(1).optional(),
  company:     z.string().trim().optional(),
  industry:    z.string().trim().optional(),
  designation: z.string().trim().optional(),
  website:     z.string().trim().optional(),
  city:        z.string().trim().optional(),
  address:     z.string().trim().optional(),
  pincode:     z.string().trim().optional(),
  email:       z.string().email().optional(),
  mobile:      z.string().trim().min(8).optional(),
  password:    z.preprocess(v => (v === "" ? undefined : v), z.string().min(10).optional()),
  confirmPassword: z.preprocess(v => (v === "" ? undefined : v), z.string().min(10).optional()),
});

const ceoPhotoUpload = require("multer")({
  storage: require("multer").memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("INVALID_FILE_TYPE"), allowed.includes(file.mimetype));
  },
}).fields([{ name: "photo", maxCount: 1 }]);

router.get("/ceos", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = { appId: app._id };
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { company: re }, { email: re }, { mobile: re }, { industry: re }];
  }
  const ceos = await CEO.find(filter).sort({ createdAt: -1 });
  return res.json({ ceos: ceos.map(toPublicCEO) });
});

router.post("/ceos", ceoPhotoUpload, async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });
    const parsed = ceoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message === "PASSWORD_MISMATCH" ? "PASSWORD_MISMATCH" : "VALIDATION_ERROR" });
    }
    const email = parsed.data.email.toLowerCase();
    if (await CEO.findOne({ email })) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    let photoUrl, photoKey;
    const photoFile = req.files?.photo?.[0];
    if (photoFile) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const up = await uploadToR2(photoFile, "ceos/photos");
      photoUrl = up.url; photoKey = up.key;
    }
    const ceo = await CEO.create({
      appId: app._id, name: parsed.data.name, company: parsed.data.company,
      industry: parsed.data.industry, designation: parsed.data.designation,
      website: parsed.data.website, city: parsed.data.city,
      address: parsed.data.address, pincode: parsed.data.pincode,
      email, mobile: parsed.data.mobile,
      passwordHash: await hashPassword(parsed.data.password),
      photoUrl, photoKey,
    });
    return res.status(201).json({ ceo: toPublicCEO(ceo) });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    throw err;
  }
});

router.patch("/ceos/:id", ceoPhotoUpload, async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CEO.findOne({ _id: req.params.id, appId: app._id });
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  const parsed = ceoUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  if (parsed.data.password && parsed.data.password !== parsed.data.confirmPassword)
    return res.status(400).json({ error: "PASSWORD_MISMATCH" });
  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    if (await CEO.findOne({ email, _id: { $ne: ceo._id } })) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    ceo.email = email;
  }
  for (const f of ["name", "company", "industry", "designation", "website", "city", "address", "pincode", "mobile"]) {
    if (parsed.data[f] !== undefined) ceo[f] = parsed.data[f];
  }
  if (parsed.data.password) ceo.passwordHash = await hashPassword(parsed.data.password);
  const photoFile = req.files?.photo?.[0];
  if (photoFile) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    const up = await uploadToR2(photoFile, "ceos/photos");
    ceo.photoUrl = up.url; ceo.photoKey = up.key;
  }
  await ceo.save();
  return res.json({ ceo: toPublicCEO(ceo) });
});

router.delete("/ceos/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const deleted = await CEO.findOneAndDelete({ _id: req.params.id, appId: app._id });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

router.post("/ceos/:id/login-as", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CEO.findOne({ _id: req.params.id, appId: app._id });
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  if (!ceo.isActive) return res.status(403).json({ error: "CEO_DISABLED" });
  // Embed appId so getAppForUser resolves parent App for all CEO routes
  const accessToken = signAccessToken({
    sub: ceo._id.toString(),
    appId: app._id.toString(),
    email: ceo.email,
    role: "APP",
    name: ceo.name,
    businessName: ceo.name,
    dashboardType: "default",
    showCandidates: false,
  });
  return res.json({
    accessToken,
    user: {
      id: ceo._id.toString(),
      email: ceo.email,
      role: "APP",
      name: ceo.name,
      businessName: ceo.name,
      dashboardType: "default",
      showCandidates: false,
    },
  });
});

module.exports = { appPortalRouter: router };
