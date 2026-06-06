const express = require("express");
const { Post } = require("../models/Post");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { logoUpload } = require("../middleware/upload");

const router = express.Router();

// ── List posts ──────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  const filter = { appId: req.user.sub };
  if (category && category !== "All") filter.category = category;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: re }, { summary: re }, { tags: re }];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [posts, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Post.countDocuments(filter),
  ]);
  return res.json({ posts, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

// ── Create post ──────────────────────────────────────────────────────────────
router.post("/", logoUpload.array("media", 10), async (req, res) => {
  const { title, category, author, summary, content, tags, published, mediaUrls: bodyUrls } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "VALIDATION_ERROR" });

  let mediaUrls = [];
  if (req.files?.length) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    for (const file of req.files) {
      const uploaded = await uploadToR2(file, "posts/media");
      mediaUrls.push(uploaded.url);
    }
  }
  if (bodyUrls) {
    const extra = Array.isArray(bodyUrls) ? bodyUrls : [bodyUrls];
    mediaUrls = [...mediaUrls, ...extra.filter(Boolean)];
  }

  const post = await Post.create({
    appId:     req.user.sub,
    title:     title.trim(),
    category:  category || "News",
    author:    author?.trim(),
    summary:   summary?.trim(),
    content:   content.trim(),
    tags:      tags ? String(tags).split(",").map((t) => t.trim()).filter(Boolean) : [],
    mediaUrls,
    published: published === "false" ? false : true,
  });
  return res.status(201).json({ post });
});

// ── AI Fill (Groq) ────────────────────────────────────────────────────────────
router.post("/ai-fill", async (req, res) => {
  const { topic } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: "TOPIC_REQUIRED" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "GROQ_NOT_CONFIGURED" });

  try {
    const prompt = `You are a news/blog content writer for an Indian political campaign platform.\nGenerate a complete post for the topic: "${topic}"\n\nReturn a JSON object with exactly these keys:\n- title: a compelling headline\n- summary: 1-2 sentence description\n- content: 3-4 paragraphs of body text (use \\n\\n between paragraphs)\n- tags: comma-separated tag string e.g. "tag1, tag2, tag3"\n- category: one of News, Politics, Events, Opinion, Announcement`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    const groqData = await groqRes.json();
    if (groqData?.error) return res.status(502).json({ error: "GROQ_API_ERROR", message: groqData.error.message });
    const raw = groqData?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    return res.json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "AI_ERROR", message: e.message });
  }
});

// ── AI Image (Unsplash) ───────────────────────────────────────────────────────
router.post("/ai-images", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "PROMPT_REQUIRED" });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return res.status(503).json({ error: "UNSPLASH_NOT_CONFIGURED" });

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(prompt)}&per_page=6&orientation=landscape`;
    const resp = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });
    const data = await resp.json();
    const images = (data.results || []).map((img) => ({
      id:     img.id,
      url:    img.urls.regular,
      thumb:  img.urls.thumb,
      alt:    img.alt_description || prompt,
      credit: img.user?.name,
    }));
    return res.json({ images });
  } catch (e) {
    return res.status(500).json({ error: "IMAGE_ERROR", message: e.message });
  }
});

// ── Update post ──────────────────────────────────────────────────────────────
router.patch("/:id", logoUpload.array("media", 10), async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, appId: req.user.sub });
  if (!post) return res.status(404).json({ error: "NOT_FOUND" });

  const { title, category, author, summary, content, tags, published, mediaUrls: bodyUrls, replaceMedia } = req.body;
  if (title)             post.title    = title.trim();
  if (category)          post.category = category;
  if (author !== undefined)  post.author  = author?.trim();
  if (summary !== undefined) post.summary = summary?.trim();
  if (content)           post.content  = content.trim();
  if (tags !== undefined) post.tags = String(tags).split(",").map((t) => t.trim()).filter(Boolean);
  if (published !== undefined) post.published = published !== "false";

  if (replaceMedia === "true") post.mediaUrls = [];
  if (req.files?.length) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    for (const file of req.files) {
      const uploaded = await uploadToR2(file, "posts/media");
      post.mediaUrls.push(uploaded.url);
    }
  }
  if (bodyUrls) {
    const extra = Array.isArray(bodyUrls) ? bodyUrls : [bodyUrls];
    post.mediaUrls = [...post.mediaUrls, ...extra.filter(Boolean)];
  }

  await post.save();
  return res.json({ post });
});

// ── Delete post ──────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const deleted = await Post.findOneAndDelete({ _id: req.params.id, appId: req.user.sub });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

module.exports = { postsRouter: router };
