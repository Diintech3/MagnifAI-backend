const express = require("express");
const multer = require("multer");
const { GeneratedContent } = require("../models/GeneratedContent");
const { ContentFolder } = require("../models/ContentFolder");
const { App } = require("../models/App");
const { CeoProfile } = require("../models/CeoProfile");
const { PromptLibrary } = require("../models/PromptLibrary");
const { uploadToR2, isR2Configured, generatePresignedUploadUrl } = require("../utils/r2");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("INVALID_FILE_TYPE"));
  },
});

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  "Article","Blog","FAQs","Review","Analysis","Comparison","Case Study",
  "Guide","Tutorial","Checklist","White Paper","Research Report","Interview",
  "Opinion","Success Story","News Summary","Listicle","Infographic",
  "Myth vs Fact","Resource Collection",
];

const DOMAINS = [
  "Technology","Artificial Intelligence (AI)","Startups","Business","Finance",
  "Jobs & Careers","Marketing","Branding","Leadership","Entrepreneurship",
  "Sales","Productivity","Education","Software Development","Cyber Security",
  "Data Science","E-commerce","Innovation","Investment & Venture Capital","Digital Transformation",
];

const PLATFORM_LIMITS = {
  linkedin: 3000, twitter: 280, instagram: 2200, facebook: 63206,
  reddit: 40000, quora: 10000, medium: null, youtube: 5000,
  threads: 500, substack: null, "dev.to": null, hashnode: null,
};

const MAIN_PLATFORMS = ["linkedin","twitter","instagram","facebook","reddit","quora","medium","youtube","threads","substack"];

const SYSTEM_PROMPT = `You are an elite content strategist, SEO specialist, and thought-leadership writer with 20+ years of experience crafting content for Fortune 500 CEOs, startup founders, and global business leaders.

Your content is:
- SEO Optimized: keyword-rich titles, meta descriptions, slug, schema-ready
- AEO Optimized: question-answer format, featured snippet ready, voice search optimized
- GEO Optimized: location-aware, regional relevance, local search signals
- Humanized: natural language, no AI detection patterns, passes Originality.ai
- Thought-leadership quality: data-driven, authoritative, original insights

Always respond with a valid JSON object in exactly this structure:
{
  "title": "SEO-optimized compelling title",
  "metaTitle": "60 character meta title with primary keyword",
  "metaDesc": "150-160 character meta description with primary keyword naturally embedded",
  "slug": "url-friendly-slug-with-primary-keyword",
  "keywords": ["primary keyword", "secondary keyword", "lsi keyword 1", "lsi keyword 2", "lsi keyword 3"],
  "content": "full content with proper H2/H3 headings, bullet points, data, examples",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"],
  "cta": "specific, compelling call to action tailored to the platform",
  "faq": "5 Q&A pairs in markdown format",
  "imagePrompt": "detailed, professional image generation prompt for DALL-E or Midjourney",
  "videoPrompt": "structured 60-second video script with hook, body, CTA",
  "internalLinks": ["anchor text 1 → /placeholder-url-1", "anchor text 2 → /placeholder-url-2"],
  "externalRefs": ["Source Name (year) - relevant finding - https://example.com", "Source 2 - finding - https://example.com"],
  "scores": {
    "seo": 95, "aeo": 92, "geo": 88, "readability": 98,
    "humanScore": 96, "aiDetection": 8, "originality": 99
  }
}

Rules:
- Never use filler phrases like "In conclusion", "It is important to note"
- Write like the CEO — use first person where appropriate
- Include real data points, statistics, and industry references
- Structure for skimmability: short paragraphs, subheadings, lists
- Platform-native formatting (LinkedIn posts differ from Medium articles)`;

function buildSignature(ceoName, company, industry, website, country) {
  const lines = [];
  lines.push(`\n\n---`);
  lines.push(`**${ceoName}**`);
  if (company)  lines.push(company);
  if (industry) lines.push(industry);
  const meta = [website, country].filter(Boolean).join(" | ");
  if (meta) lines.push(meta);
  return lines.join("\n");
}

function buildPrompt({ ceoName, company, website, industry, brandVoice, targetAudience, country, topic, domain, contentType, platform, tone, language, wordCount, primaryKeyword, secondaryKeyword, targetLocation, options }) {
  const opts = options || {};
  return `Generate a ${contentType} for ${ceoName}${company ? ` (${company})` : ""}${industry ? ` in the ${industry} industry` : ""}${country ? `, based in ${country}` : ""}.

Topic: ${topic}
Domain: ${domain}
Target Platform: ${platform}
Target Audience: ${targetAudience || "Business professionals and decision makers"}
Tone: ${tone}
Language: ${language}
Target Word Count: ${wordCount} words
${primaryKeyword ? `Primary Keyword: ${primaryKeyword}` : ""}
${secondaryKeyword ? `Secondary Keyword: ${secondaryKeyword}` : ""}
${targetLocation ? `Target Location: ${targetLocation}` : ""}
${website ? `Author Website: ${website}` : ""}
${brandVoice ? `Brand Voice: ${brandVoice}` : ""}

Content Requirements:
- Position ${ceoName} as a thought leader in ${domain}
- Write in ${tone} tone, audience: ${targetAudience || "business professionals"}
- Platform-optimized for ${platform}
${opts.seoOptimized ? "- Full SEO optimization with keyword density 1.5-2%" : ""}
${opts.aeoOptimized ? "- AEO: Include 3-5 question-answer pairs, featured snippet format" : ""}
${opts.geoOptimized ? `- GEO: Include location signals for ${targetLocation || country || "India"}, local search optimization` : ""}
${opts.humanized ? "- Humanized: Natural language, first-person voice, conversational flow, 0% AI detection" : ""}
${opts.addCta ? "- Include a strong, platform-specific CTA at the end" : ""}
${opts.addHashtags ? "- Generate 8 trending, niche-specific hashtags" : ""}
${opts.addFaq ? "- Include a 5-question FAQ section at the end" : ""}
${opts.generateImagePrompt ? "- Create a detailed DALL-E/Midjourney image generation prompt" : ""}
${opts.generateVideoScript ? "- Create a structured 60-second video script with hook, body, CTA" : ""}
${opts.addInternalLinks ? "- Suggest 3 internal linking anchor texts with placeholder URLs" : ""}
${opts.addExternalRefs ? "- Include 2-3 credible external references (studies, reports, news)" : ""}

Generate the complete, publication-ready ${contentType} now.`;
}

function formatForPlatform(content, title, hashtags, cta, platform, ceoName, company, website) {
  const tags = (hashtags || []).join(" ");
  const limit = PLATFORM_LIMITS[platform];
  const sig = `\n\n— ${ceoName}${company ? `, ${company}` : ""}${website ? ` | ${website}` : ""}`;

  const formats = {
    linkedin:  `${title}\n\n${content}\n\n${cta}${sig}\n\n${tags}`,
    twitter:   buildTwitterThread(title, content, tags, sig),
    instagram: `${title}\n\n${content.slice(0, 1800)}\n\n${cta}${sig}\n\n${tags}`,
    facebook:  `${title}\n\n${content}\n\n${cta}${sig}\n\n${tags}`,
    reddit:    `**${title}**\n\n${content}\n\n---\n*${cta}*${sig}`,
    quora:     `## ${title}\n\n${content}\n\n**${cta}**${sig}`,
    medium:    `# ${title}\n\n${content}\n\n---\n*${cta}*${sig}`,
    youtube:   `${title}\n\n${content.slice(0, 4800)}\n\n${cta}${sig}\n\n${tags}`,
    threads:   `${title}\n\n${content.slice(0, 380)}${sig}\n\n${tags}`,
    substack:  `# ${title}\n\n${content}\n\n---\n*${cta}*${sig}`,
  };

  let formatted = formats[platform] || `${title}\n\n${content}\n\n${cta}`;
  if (limit && formatted.length > limit) {
    formatted = formatted.slice(0, limit - 3) + "...";
  }
  return formatted;
}

function buildTwitterThread(title, content, tags, sig = "") {
  const sentences = content.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  const tweets = [];
  let current = `🧵 ${title}\n\n`;

  for (const sentence of sentences) {
    if ((current + sentence).length > 270) {
      if (current.trim()) tweets.push(current.trim());
      current = sentence + " ";
    } else {
      current += sentence + " ";
    }
  }
  if (current.trim()) tweets.push(current.trim());
  tweets.push(`${tags}${sig}`);

  return tweets.map((t, i) => `${i + 1}/${tweets.length}\n${t}`).join("\n\n---\n\n");
}

async function callGroq(apiKey, userPrompt, maxTokens = 4096) {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
  let lastError;
  for (const model of models) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });
      const groqData = await groqRes.json();
      if (groqData.error) {
        // Rate limit — try next model
        if (groqData.error.code === "rate_limit_exceeded" || groqData.error.type === "tokens") {
          lastError = new Error(groqData.error.message);
          continue;
        }
        throw new Error(groqData.error.message);
      }
      return JSON.parse(groqData.choices[0].message.content);
    } catch (e) {
      lastError = e;
      // If not a rate limit error, don't retry
      if (!e.message?.includes("Rate limit") && !e.message?.includes("rate_limit")) throw e;
    }
  }
  throw lastError;
}

async function getAppForUser(req) {
  if (req.user.appId) return App.findById(req.user.appId);
  return App.findById(req.user.sub);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/app/content/presign-upload
router.post("/presign-upload", async (req, res) => {
  const { mimetype } = req.body;
  if (!mimetype || !mimetype.startsWith("image/")) return res.status(400).json({ error: "Invalid mimetype" });
  if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
  try {
    const { presignedUrl, key, publicUrl } = await generatePresignedUploadUrl(mimetype);
    const fullPublicUrl = publicUrl.startsWith("/") ? `${req.protocol}://${req.get("host")}${publicUrl}` : publicUrl;
    return res.json({ presignedUrl, key, publicUrl: fullPublicUrl });
  } catch (e) {
    console.error("[presign-upload]", e.message);
    return res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

// POST /api/app/content/upload-image
router.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });
  if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
  try {
    const { url } = await uploadToR2(req.file, "content/images");
    const fullUrl = url.startsWith("/") ? `${req.protocol}://${req.get("host")}${url}` : url;
    return res.json({ url: fullUrl });
  } catch (e) {
    console.error("[upload-image]", e.message);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/app/content/suggest-keywords
router.post("/suggest-keywords", async (req, res) => {
  const { topic, domain, platform } = req.body;
  if (!topic) return res.status(400).json({ error: "topic required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI not configured" });

  try {
    const prompt = `You are an SEO expert. Analyze the topic and suggest the most relevant SEO keywords and geographic location.

Topic: "${topic}"
Domain: ${domain || "General"}
Platform: ${platform || "General"}

Instructions:
- primaryKeyword: extract the most important 2-4 word keyword phrase DIRECTLY from the topic
- secondaryKeyword: a closely related LSI keyword phrase based on the topic
- targetLocation: if the topic mentions a specific city/country use that. If it is about India or Indian context use "India". If no location context, use "Global". NEVER say "United States" unless the topic is specifically about USA.

Examples:
- Topic "How to grow startup in Mumbai" → targetLocation: "Mumbai, India"
- Topic "AI trends for founders" → targetLocation: "India"
- Topic "Leadership tips for CEOs" → targetLocation: "Global"
- Topic "Startup funding in Delhi" → targetLocation: "Delhi, India"

Respond with ONLY valid JSON:
{
  "primaryKeyword": "...",
  "secondaryKeyword": "...",
  "targetLocation": "..."
}`;

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message);
    const suggestions = JSON.parse(data.choices[0].message.content);
    return res.json(suggestions);
  } catch (e) {
    console.error("[suggest-keywords]", e.message);
    return res.status(500).json({ error: "Suggestion failed" });
  }
});

// GET /api/app/content/stats/overview  — MUST be before /:id
router.get("/stats/overview", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [total, byStatus, byDomain, byType, byPlatform, todayCount, activeCeos, queueCount] = await Promise.all([
    GeneratedContent.countDocuments({ appId: app._id }),
    GeneratedContent.aggregate([
      { $match: { appId: app._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    GeneratedContent.aggregate([
      { $match: { appId: app._id } },
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
    GeneratedContent.aggregate([
      { $match: { appId: app._id } },
      { $group: { _id: "$contentType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
    GeneratedContent.aggregate([
      { $match: { appId: app._id } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
    GeneratedContent.countDocuments({ appId: app._id, createdAt: { $gte: today } }),
    GeneratedContent.distinct("ceoName", { appId: app._id }),
    GeneratedContent.countDocuments({ appId: app._id, status: { $in: ["pending","approved","assigned"] } }),
  ]);

  // Team performance
  const teamStats = await GeneratedContent.aggregate([
    { $match: { appId: app._id, assignedTo: { $ne: null, $exists: true } } },
    { $group: {
      _id: "$assignedTo",
      total: { $sum: 1 },
      completed: { $sum: { $cond: [{ $in: ["$status", ["published","verified","completed"]] }, 1, 0] } },
      pending:   { $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] } },
      rejected:  { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
    }},
    { $sort: { completed: -1 } },
  ]);

  // Analytics totals
  const analyticsAgg = await GeneratedContent.aggregate([
    { $match: { appId: app._id } },
    { $group: {
      _id: null,
      totalViews:      { $sum: "$views" },
      totalImpressions:{ $sum: "$impressions" },
      totalClicks:     { $sum: "$clicks" },
      totalShares:     { $sum: "$shares" },
      totalComments:   { $sum: "$comments" },
      totalMentions:   { $sum: "$mentions" },
    }},
  ]);
  const analytics = analyticsAgg[0] || {};

  return res.json({
    total, byStatus, byDomain, byType, byPlatform, todayCount,
    activeCeos: activeCeos.length,
    contentQueue: queueCount,
    teamStats,
    analytics,
  });
});

// POST /api/app/content/generate
router.post("/generate", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const {
    ceoProfileId,
    ceoName: rawCeoName, company: rawCompany, website: rawWebsite,
    industry: rawIndustry, brandVoice: rawBrandVoice, targetAudience: rawAudience, country: rawCountry,
    topic, domain, contentType, platform: rawPlatform, platforms: rawPlatforms, tone, language, wordCount,
    primaryKeyword, secondaryKeyword, targetLocation, options, saveMode, scheduledAt,
    customPrompt, folderId,
  } = req.body;

  // Support both single platform (string) and multi platforms (array)
  const platforms = Array.isArray(rawPlatforms) && rawPlatforms.length > 0
    ? rawPlatforms
    : rawPlatform ? [rawPlatform] : null;
  const platform = platforms ? platforms[0] : null;

  // If ceoProfileId given, load profile and merge (profile wins over empty fields)
  let ceoName = rawCeoName, company = rawCompany, website = rawWebsite;
  let industry = rawIndustry, brandVoice = rawBrandVoice;
  let targetAudience = rawAudience, country = rawCountry;

  if (ceoProfileId) {
    const profile = await CeoProfile.findOne({ _id: ceoProfileId, appId: app._id });
    if (profile) {
      ceoName      = profile.name;
      company      = profile.company      || company;
      website      = profile.website      || website;
      industry     = profile.industry     || industry;
      brandVoice   = profile.brandVoice   || brandVoice;
      targetAudience = profile.targetAudience || targetAudience;
      country      = profile.country      || country;
    }
  }

  // If customPrompt given, increment its usage
  if (customPrompt?.promptId) {
    await PromptLibrary.findByIdAndUpdate(customPrompt.promptId, { $inc: { usageCount: 1 } }).catch(() => {});
  }

  if (!topic || !domain || !contentType || !platform || !tone || !language || !wordCount) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  // ceoName fallback if not provided
  if (!ceoName) ceoName = company || "Author";

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  try {
    const userPrompt = buildPrompt({ ceoName, company, website, industry, brandVoice, targetAudience, country, topic, domain, contentType, platform, tone, language, wordCount, primaryKeyword, secondaryKeyword, targetLocation, options });
    const output = await callGroq(apiKey, userPrompt, 4096);

    // Append CEO signature to main content
    const signatureBlock = buildSignature(ceoName, company, industry, website, country);
    output.content = (output.content || "") + signatureBlock;

    const formatted = {};
    for (const p of MAIN_PLATFORMS) {
      formatted[p] = formatForPlatform(output.content, output.title, output.hashtags, output.cta, p, ceoName, company, website);
    }

    let status = "draft";
    if (saveMode === "pending")   status = "pending";
    if (saveMode === "assigned")  status = "assigned";
    if (saveMode === "scheduled") status = "scheduled";

    const docData = {
      appId: app._id,
      ceoName, company, website, industry, brandVoice, targetAudience, country,
      topic, domain, contentType, platform, platforms: platforms || [platform], tone, language,
      wordCount: Number(wordCount),
      primaryKeyword, secondaryKeyword, targetLocation,
      options: options || {},
      output, formatted, status,
      folderId: folderId || null,
    };
    if (saveMode === "scheduled" && scheduledAt) docData.scheduledAt = new Date(scheduledAt);

    const doc = await GeneratedContent.create(docData);
    return res.status(201).json({ content: doc });
  } catch (e) {
    console.error("[content/generate]", e.message);
    return res.status(500).json({ error: e.message || "Content generation failed" });
  }
});

// POST /api/app/content/matrix — Full Matrix Generator
router.post("/matrix", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const {
    ceoName, company, website, industry, brandVoice, targetAudience, country,
    topic, platform, tone, language, wordCount, primaryKeyword, targetLocation, options,
    matrixMode = "types", // "types" | "domains" | "full"
    domains: customDomains, contentTypes: customTypes,
  } = req.body;

  if (!ceoName || !topic || !platform || !tone || !language) {
    return res.status(400).json({ error: "Required: ceoName, topic, platform, tone, language" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const batchId = `matrix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Determine what to iterate
  let typesToGenerate = customTypes || CONTENT_TYPES;
  let domainsToIterate = customDomains || [req.body.domain || DOMAINS[0]];

  if (matrixMode === "domains") {
    typesToGenerate = [req.body.contentType || CONTENT_TYPES[0]];
    domainsToIterate = DOMAINS;
  } else if (matrixMode === "full") {
    typesToGenerate = CONTENT_TYPES;
    domainsToIterate = DOMAINS;
  }

  const results = [];
  const errors = [];
  let generated = 0;

  for (const domain of domainsToIterate) {
    for (const contentType of typesToGenerate) {
      // Rate limit guard — stop at 400 in full mode
      if (matrixMode === "full" && generated >= 400) break;
      try {
        const userPrompt = buildPrompt({
          ceoName, company, website, industry, brandVoice, targetAudience, country,
          topic, domain, contentType, platform, tone, language,
          wordCount: wordCount || 800, primaryKeyword, targetLocation, options,
        });
        const output = await callGroq(apiKey, userPrompt, 2048);
        output.content = (output.content || "") + buildSignature(ceoName, company, industry, website, country);

        const formatted = {};
        for (const p of MAIN_PLATFORMS) {
          formatted[p] = formatForPlatform(output.content, output.title, output.hashtags, output.cta, p, ceoName, company, website);
        }

        const doc = await GeneratedContent.create({
          appId: app._id,
          ceoName, company, website, industry, brandVoice, targetAudience, country,
          topic, domain, contentType, platform, tone, language,
          wordCount: Number(wordCount || 800),
          primaryKeyword, targetLocation,
          options: options || {},
          output, formatted, status: "draft",
          matrixBatch: true, matrixBatchId: batchId,
        });
        results.push({ contentType, domain, id: doc._id, title: output.title });
        generated++;
      } catch (e) {
        errors.push({ contentType, domain, error: e.message });
      }
    }
    if (matrixMode === "full" && generated >= 400) break;
  }

  return res.status(201).json({ generated: results.length, failed: errors.length, batchId, results, errors });
});

// ── Folder Routes ────────────────────────────────────────────────────────────

// GET /api/app/content/folders
router.get("/folders", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const folders = await ContentFolder.find({ appId: app._id }).sort({ createdAt: -1 });
  // attach content count to each folder
  const counts = await GeneratedContent.aggregate([
    { $match: { appId: app._id, folderId: { $in: folders.map(f => f._id) } } },
    { $group: { _id: "$folderId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
  return res.json({ folders: folders.map(f => ({ ...f.toObject(), contentCount: countMap[f._id.toString()] || 0 })) });
});

// POST /api/app/content/folders
router.post("/folders", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { name, color, topic, description, category } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Folder name is required" });
  const folder = await ContentFolder.create({ appId: app._id, name: name.trim(), topic: topic?.trim() || "", description: description?.trim() || "", category: category || "Alpha", color: color || "#6366f1" });
  return res.status(201).json({ folder });
});

// PATCH /api/app/content/folders/:id
router.patch("/folders/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { name, color, topic, description, category } = req.body;
  const folder = await ContentFolder.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: {
      ...(name        && { name: name.trim() }),
      ...(color       && { color }),
      ...(topic       !== undefined && { topic: topic.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(category    && { category }),
    }},
    { new: true }
  );
  if (!folder) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ folder });
});

// DELETE /api/app/content/folders/:id
router.delete("/folders/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  await ContentFolder.findOneAndDelete({ _id: req.params.id, appId: app._id });
  // unassign contents from this folder
  await GeneratedContent.updateMany({ appId: app._id, folderId: req.params.id }, { $set: { folderId: null } });
  return res.json({ ok: true });
});

// GET /api/app/content
router.get("/", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const { page = 1, limit = 30, status, domain, contentType, platform, priority, assignedTo, search, dateFrom, dateTo, folderId } = req.query;
  const filter = { appId: app._id };

  if (folderId === "none") filter.folderId = null;
  else if (folderId)       filter.folderId = folderId;
  if (status)     filter.status = status;
  if (domain)     filter.domain = domain;
  if (contentType)filter.contentType = contentType;
  if (platform)   filter.platform = platform;
  if (priority)   filter.priority = priority;
  if (assignedTo) filter.assignedTo = { $regex: assignedTo, $options: "i" };
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
  }
  if (search) filter.$or = [
    { topic:          { $regex: search, $options: "i" } },
    { "output.title": { $regex: search, $options: "i" } },
    { ceoName:        { $regex: search, $options: "i" } },
  ];

  const [items, total] = await Promise.all([
    GeneratedContent.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-formatted -output.content"),
    GeneratedContent.countDocuments(filter),
  ]);

  return res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// GET /api/app/content/:id
router.get("/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const doc = await GeneratedContent.findOne({ _id: req.params.id, appId: app._id });
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });

  return res.json({ content: doc });
});

// PATCH /api/app/content/:id  — update output/content fields
router.patch("/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const allowed = [
    "output", "topic", "status", "priority", "assignedTo", "assignedBy",
    "deadline", "instructions", "folderId", "language", "tone",
  ];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "output" && typeof req.body.output === "object") {
        // Merge output fields individually to avoid overwriting scores etc.
        for (const [k, v] of Object.entries(req.body.output)) {
          update[`output.${k}`] = v;
        }
      } else {
        update[key] = req.body[key];
      }
    }
  }

  if (Object.keys(update).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });

  const doc = await GeneratedContent.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: update },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ content: doc });
});

// PATCH /api/app/content/:id/status
router.patch("/:id/status", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const { status, assignedTo, assignedBy, deadline, priority, instructions, verificationUrl, screenshotUrl } = req.body;
  const allowed = ["draft","pending","approved","assigned","published","verified","completed","rejected","scheduled"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const update = { status };
  if (assignedTo)      update.assignedTo = assignedTo;
  if (assignedBy)      update.assignedBy = assignedBy;
  if (deadline)        update.deadline = new Date(deadline);
  if (priority)        update.priority = priority;
  if (instructions)    update.instructions = instructions;
  if (verificationUrl) update.verificationUrl = verificationUrl;
  if (screenshotUrl)   update.screenshotUrl = screenshotUrl;
  if (status === "published")  update.publishedAt = new Date();
  if (status === "scheduled" && req.body.scheduledAt) update.scheduledAt = new Date(req.body.scheduledAt);

  const doc = await GeneratedContent.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: update },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ content: doc });
});

// PATCH /api/app/content/:id/analytics — update views/clicks/shares etc.
router.patch("/:id/analytics", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const { views, impressions, clicks, shares, comments, mentions } = req.body;
  const inc = {};
  if (views)       inc.views       = Number(views);
  if (impressions) inc.impressions = Number(impressions);
  if (clicks)      inc.clicks      = Number(clicks);
  if (shares)      inc.shares      = Number(shares);
  if (comments)    inc.comments    = Number(comments);
  if (mentions)    inc.mentions    = Number(mentions);

  const doc = await GeneratedContent.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $inc: inc },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ content: doc });
});

// DELETE /api/app/content/:id
router.delete("/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  await GeneratedContent.findOneAndDelete({ _id: req.params.id, appId: app._id });
  return res.json({ ok: true });
});

module.exports = { contentToolsRouter: router };
