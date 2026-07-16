const express = require("express");
const { z } = require("zod");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { Campaign } = require("../models/Campaign");
const { CEO, toPublicCEO } = require("../models/CEO");
const { Script } = require("../models/Script");
const { hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { candidateUpload, logoUpload } = require("../middleware/upload");
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
      isCEO:        true,
      role:         "CEO",
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
    isCEO:        false,
    role:         "APP",
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
    role: "CEO",
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
      role: "CEO",
      name: ceo.name,
      businessName: ceo.name,
      dashboardType: "default",
      showCandidates: false,
    },
  });
});

// ── Scripts Management & Approvals ───────────────────────────────────────────

// GET all scripts submitted by CEOs & Candidates under this App
router.get("/scripts", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    // Fetch creators under this app
    const ceos = await CEO.find({ appId: app._id });
    const candidates = await Candidate.find({ appId: app._id });

    const creatorsMap = {};
    ceos.forEach(c => {
      creatorsMap[c._id.toString()] = { name: c.name, role: "CEO" };
    });
    candidates.forEach(c => {
      creatorsMap[c._id.toString()] = { name: c.name, role: "Candidate" };
    });

    const creatorIds = Object.keys(creatorsMap);
    // Find all scripts that belong to creators under this app OR have appId matching this app
    const scripts = await Script.find({
      $or: [
        { userId: { $in: creatorIds } },
        { userIds: { $in: creatorIds } },
        { appId: app._id }
      ]
    }).sort({ createdAt: -1 });

    const formatted = scripts.map(s => {
      const ids = s.userIds && s.userIds.length > 0 ? s.userIds.map(id => id.toString()) : (s.userId ? [s.userId.toString()] : []);
      const assigned = ids.map(id => {
        const found = creatorsMap[id];
        return found ? { creatorId: id, name: found.name, role: found.role } : null;
      }).filter(Boolean);

      return {
        scriptId: s._id.toString(),
        userIds: ids,
        userId: s.userId ? s.userId.toString() : null,
        assignedCreators: assigned,
        title: s.title,
        body: s.body,
        description: s.description || null,
        category: s.category,
        duration: s.duration,
        scheduledDate: s.scheduledDate,
        scheduledTime: s.scheduledTime,
        approvalStatus: s.approvalStatus,
        imageUrl: s.imageUrl,
        rawVideoUrl: s.rawVideoUrl,
        processedVideoUrl: s.processedVideoUrl,
        viralVideoUrl: s.viralVideoUrl,
        processingStatus: s.processingStatus,
        processingProgress: s.processingProgress,
        objectionNote: s.objectionNote,
        statusHistory: s.statusHistory,
        createdByAdmin: s.createdByAdmin || false,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      };
    });

    return res.json({ scripts: formatted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all registered creators (CEOs and Candidates) for dropdown assignment
router.get("/creators", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const ceos = await CEO.find({ appId: app._id, isActive: true }).sort({ name: 1 });
    const candidates = await Candidate.find({ appId: app._id, isActive: true }).sort({ name: 1 });

    const creators = [
      ...ceos.map(c => ({ creatorId: c._id.toString(), name: c.name, role: "CEO" })),
      ...candidates.map(c => ({ creatorId: c._id.toString(), name: c.name, role: "Candidate" }))
    ];

    return res.json({ creators });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create script (creatorId is optional) - handles image upload
router.post("/scripts", logoUpload.single("image"), async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const { title, body, description, category, duration, scheduledDate, scheduledTime } = req.body;
    if (!title?.trim() || !body?.trim() || !category?.trim()) {
      return res.status(400).json({ error: "title, body, and category are required" });
    }
    if (!scheduledDate?.trim() || !scheduledTime?.trim()) {
      return res.status(400).json({ error: "scheduledDate (e.g. '18 July 2026') and scheduledTime (e.g. '10:00 AM') are required for admin-created scripts" });
    }

    let creatorIds = req.body.creatorIds || req.body.creatorId;
    if (typeof creatorIds === "string") {
      try {
        creatorIds = JSON.parse(creatorIds);
      } catch (e) {
        creatorIds = creatorIds ? [creatorIds] : [];
      }
    }
    if (!Array.isArray(creatorIds)) {
      creatorIds = creatorIds ? [creatorIds] : [];
    }

    let targetUserIds = [];
    for (const cid of creatorIds) {
      if (!cid) continue;
      const isCeo = await CEO.exists({ _id: cid, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
      if (isCeo || isCandidate) {
        targetUserIds.push(cid);
      }
    }

    let imageUrl = null;
    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "scripts/images");
      imageUrl = uploaded.url;
    }

    const scriptsCreated = [];
    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const s = await Script.create({
          userIds: [uid],
          userId: uid,
          appId: app._id,
          title: title.trim(),
          body: body.trim(),
          description: description ? description.trim() : null,
          category: category.trim(),
          duration: duration || "45s",
          scheduledDate: scheduledDate.trim(),
          scheduledTime: scheduledTime.trim(),
          approvalStatus: "Pending",
          createdByAdmin: true,
          statusHistory: [
            {
              status: "Pending",
              changedBy: "Founder/App Admin",
              note: "Script template created and assigned to creator."
            }
          ],
          imageUrl
        });
        scriptsCreated.push(s);
      }
    } else {
      const s = await Script.create({
        userIds: [],
        userId: null,
        appId: app._id,
        title: title.trim(),
        body: body.trim(),
        description: description ? description.trim() : null,
        category: category.trim(),
        duration: duration || "45s",
        scheduledDate: scheduledDate.trim(),
        scheduledTime: scheduledTime.trim(),
        approvalStatus: "Draft",
        createdByAdmin: true,
        statusHistory: [
          {
            status: "Draft",
            changedBy: "Founder/App Admin",
            note: "Script template created as Draft."
          }
        ],
        imageUrl
      });
      scriptsCreated.push(s);
    }

    const script = scriptsCreated[0];

    return res.status(201).json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH edit a script (any field) - handles optional image update
router.patch("/scripts/:id", logoUpload.single("image"), async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    const allUserIds = script.userIds && script.userIds.length > 0
      ? script.userIds.map(id => id.toString())
      : (script.userId ? [script.userId.toString()] : []);

    if (allUserIds.length > 0) {
      for (const uid of allUserIds) {
        const isCeo = await CEO.exists({ _id: uid, appId: app._id });
        const isCandidate = await Candidate.exists({ _id: uid, appId: app._id });
        if (isCeo || isCandidate) {
          isAuthorized = true;
          break;
        }
      }
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    const { title, body, description, category, duration, scheduledDate, scheduledTime, approvalStatus } = req.body;
    if (title !== undefined) script.title = title.trim();
    if (body !== undefined) script.body = body.trim();
    if (description !== undefined) script.description = description ? description.trim() : null;
    if (category !== undefined) script.category = category;
    if (duration !== undefined) script.duration = duration;
    if (scheduledDate !== undefined) script.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) script.scheduledTime = scheduledTime;
    if (approvalStatus !== undefined) script.approvalStatus = approvalStatus;
    
    let creatorIds = req.body.creatorIds !== undefined ? req.body.creatorIds : req.body.creatorId;
    if (creatorIds !== undefined) {
      if (typeof creatorIds === "string") {
        try {
          creatorIds = JSON.parse(creatorIds);
        } catch (e) {
          creatorIds = creatorIds ? [creatorIds] : [];
        }
      }
      if (!Array.isArray(creatorIds)) {
        creatorIds = creatorIds ? [creatorIds] : [];
      }

      let verifiedIds = [];
      for (const cid of creatorIds) {
        if (!cid) continue;
        const isCeo = await CEO.exists({ _id: cid, appId: app._id });
        const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
        if (isCeo || isCandidate) {
          verifiedIds.push(cid);
        }
      }
      
      // Auto transition status based on assignment
      if (verifiedIds.length > 0) {
        const currentCreator = script.userId ? script.userId.toString() : null;

        if (!currentCreator) {
          // Unassigned Draft template. Assign first creator here, clone for subsequent.
          const firstCreator = verifiedIds[0];
          for (let i = 1; i < verifiedIds.length; i++) {
            const cid = verifiedIds[i];
            await Script.create({
              userIds: [cid],
              userId: cid,
              appId: app._id,
              title: script.title,
              body: script.body,
              category: script.category,
              duration: script.duration,
              timeGroup: script.timeGroup,
              scheduledTime: script.scheduledTime,
              approvalStatus: "Pending",
              createdByAdmin: true,
              statusHistory: [
                {
                  status: "Pending",
                  changedBy: "Founder/App Admin",
                  note: "Script template cloned and assigned to creator."
                }
              ],
              imageUrl: script.imageUrl
            });
          }

          script.userIds = [firstCreator];
          script.userId = firstCreator;
          script.approvalStatus = "Pending";
          script.statusHistory.push({
            status: "Pending",
            changedBy: "Founder/App Admin",
            note: "Script template assigned to creator."
          });
        } else {
          // Already assigned. Clone for any *new* creator IDs not matching the current one.
          for (const cid of verifiedIds) {
            if (cid.toString() === currentCreator) continue;
            await Script.create({
              userIds: [cid],
              userId: cid,
              appId: app._id,
              title: script.title,
              body: script.body,
              category: script.category,
              duration: script.duration,
              timeGroup: script.timeGroup,
              scheduledTime: script.scheduledTime,
              approvalStatus: "Pending",
              createdByAdmin: true,
              statusHistory: [
                {
                  status: "Pending",
                  changedBy: "Founder/App Admin",
                  note: "Script template cloned and assigned to creator."
                }
              ],
              imageUrl: script.imageUrl
            });
          }

          script.userIds = [currentCreator];
          script.userId = currentCreator;
        }
      } else {
        // Unassigned, set status to Draft
        script.userIds = [];
        script.userId = null;
        script.approvalStatus = "Draft";
        script.statusHistory.push({
          status: "Draft",
          changedBy: "Founder/App Admin",
          note: "Script template unassigned from all creators."
        });
      }
    }

    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "scripts/images");
      script.imageUrl = uploaded.url;
    }

    await script.save();

    return res.json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE a script
router.delete("/scripts/:id", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    if (script.userId) {
      const isCeo = await CEO.exists({ _id: script.userId, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: script.userId, appId: app._id });
      isAuthorized = isCeo || isCandidate;
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    await Script.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update script status (Approve / Reject / etc.)
router.put("/scripts/:id/status", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    if (script.userId) {
      const isCeo = await CEO.exists({ _id: script.userId, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: script.userId, appId: app._id });
      isAuthorized = isCeo || isCandidate;
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    const { status, note } = req.body;
    const allowed = ["Draft", "Pending", "Waiting", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: "invalid or missing status" });
    }

    if (status === "Objection") {
      script.objectionNote = note || "Objection raised by founder.";
      script.approvalStatus = "Objection";
      script.statusHistory.push({
        status: "Objection",
        changedBy: "Founder/App Admin",
        note: note || "Objection raised by founder."
      });
      await script.save();

      // Trigger re-editing using the pipeline in background
      const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");
      triggerAiPipelineForScript(script).catch(err => {
        console.error("[objection-trigger-error]", err.message);
      });
    } else {
      script.approvalStatus = status;
      script.statusHistory.push({
        status,
        changedBy: "Founder/App Admin",
        note: note || `Status updated to ${status}`
      });
      await script.save();
    }

    return res.json({
      scriptId: script._id.toString(),
      approvalStatus: script.approvalStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST auto-generate script body using Groq AI
router.post("/generate-script", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "GROQ_NOT_CONFIGURED" });

    const { title, category, duration, description, creatorIds, scheduledDate, scheduledTime } = req.body;
    const now = new Date();
    const aiScheduledDate = scheduledDate?.trim() || now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const aiScheduledTime = scheduledTime?.trim() || now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (!category?.trim()) {
      return res.status(400).json({ error: "category is required" });
    }

    const finalTitle = (title && title.trim()) ? title.trim() : "AI Generated UGC Template";

    const prompt = `Write a high-converting, engaging UGC video speech script titled "${finalTitle}" for the category "${category.trim()}". The duration should be approximately ${duration || "45s"}.
${description ? `Context/Description of the script: ${description.trim()}` : ""}

Format the output with distinct parts like:
[HOOK]
...
[MAIN CONTENT]
...
[CTA]
...
Write ONLY the script content. Do not include any conversational intro/outro or styling outside the script parts.`;

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });
    const data = await r.json();
    if (data?.error) {
      return res.status(502).json({ error: "GROQ_API_ERROR", message: data.error.message });
    }
    const scriptBody = (data.choices?.[0]?.message?.content || "").trim();

    // Create the script template in the database
    let parsedCreatorIds = creatorIds;
    if (typeof parsedCreatorIds === "string") {
      try {
        parsedCreatorIds = JSON.parse(parsedCreatorIds);
      } catch (e) {
        parsedCreatorIds = parsedCreatorIds ? [parsedCreatorIds] : [];
      }
    }
    if (!Array.isArray(parsedCreatorIds)) {
      parsedCreatorIds = parsedCreatorIds ? [parsedCreatorIds] : [];
    }

    let targetUserIds = [];
    for (const cid of parsedCreatorIds) {
      if (!cid) continue;
      const isCeo = await CEO.exists({ _id: cid, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
      if (isCeo || isCandidate) {
        targetUserIds.push(cid);
      }
    }

    const scriptsCreated = [];
    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const s = await Script.create({
          userIds: [uid],
          userId: uid,
          appId: app._id,
          title: finalTitle,
          body: scriptBody,
          description: description ? description.trim() : null,
          category: category.trim(),
          duration: duration || "45s",
          scheduledDate: aiScheduledDate,
          scheduledTime: aiScheduledTime,
          approvalStatus: "Pending",
          createdByAdmin: true,
          statusHistory: [
            {
              status: "Pending",
              changedBy: "Founder/App Admin",
              note: "Script template created via AI and assigned to creator."
            }
          ]
        });
        scriptsCreated.push(s);
      }
    } else {
      const s = await Script.create({
        userIds: [],
        userId: null,
        appId: app._id,
        title: finalTitle,
        body: scriptBody,
        description: description ? description.trim() : null,
        category: category.trim(),
        duration: duration || "45s",
        scheduledDate: aiScheduledDate,
        scheduledTime: aiScheduledTime,
        approvalStatus: "Draft",
        createdByAdmin: true,
        statusHistory: [
          {
            status: "Draft",
            changedBy: "Founder/App Admin",
            note: "Script template created via AI as Draft."
          }
        ]
      });
      scriptsCreated.push(s);
    }

    const script = scriptsCreated[0];

    return res.status(201).json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = { appPortalRouter: router };
