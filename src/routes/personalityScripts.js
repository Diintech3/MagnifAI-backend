const express = require("express");
const { Script } = require("../models/Script");

const router = express.Router();

// ── GET all scripts for authenticated user ───────────────────────────────
router.get("/scripts", async (req, res) => {
  try {
    const userId = req.user.sub;
    const { category, status, type } = req.query;

    let filter = {};
    if (type === "private") {
      filter = { userId, createdByAdmin: { $ne: true } };
    } else if (type === "public") {
      filter = { userId, createdByAdmin: true };
    } else {
      filter = {
        $or: [
          { userId },
          { userIds: userId }
        ]
      };
    }

    if (category) filter.category = category;
    if (status) filter.approvalStatus = status;

    const scripts = await Script.find(filter).sort({ createdAt: -1 });

    const formatted = scripts.map(s => ({
      scriptId: s._id.toString(),
      userId: s.userId ? s.userId.toString() : null,
      userIds: s.userIds ? s.userIds.map(id => id.toString()) : [],
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
      createdByAdmin: s.createdByAdmin || false,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST create new script ────────────────────────────────────────────────
router.post("/scripts", async (req, res) => {
  try {
    const userId = req.user.sub;
    const { title, body, category, description } = req.body;

    if (!title?.trim() || !body?.trim() || !category?.trim()) {
      return res.status(400).json({ error: "title, body, and category are required" });
    }

    // Auto-calculate duration (approx 130 words per minute, default to 45s if very short)
    const wordsCount = body.trim().split(/\s+/).length;
    const calculatedSecs = Math.max(15, Math.round((wordsCount / 130) * 60));
    const duration = `${calculatedSecs}s`;

    const { CEO } = require("../models/CEO");
    const { Candidate } = require("../models/Candidate");
    const creator = (await CEO.findById(userId)) || (await Candidate.findById(userId));
    const appId = creator ? creator.appId : null;

    const script = await Script.create({
      userId,
      userIds: [userId],
      appId,
      title: title.trim(),
      body: body.trim(),
      description: description ? description.trim() : null,
      category: category.trim(),
      duration,
      scheduledDate: "Self-scheduled",
      scheduledTime: "Self-scheduled",
      approvalStatus: "Draft"
    });

    return res.status(201).json({
      scriptId: script._id.toString(),
      userId: script.userId ? script.userId.toString() : null,
      userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
      title: script.title,
      body: script.body,
      description: script.description || null,
      category: script.category,
      duration: script.duration,
      scheduledDate: script.scheduledDate,
      scheduledTime: script.scheduledTime,
      approvalStatus: script.approvalStatus,
      createdAt: script.createdAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET details of specific script ───────────────────────────────────────
router.get("/scripts/:id", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({ _id: req.params.id, userId });

    if (!script) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({
      scriptId: script._id.toString(),
      userId: script.userId.toString(),
      title: script.title,
      body: script.body,
      description: script.description || null,
      category: script.category,
      duration: script.duration,
      scheduledDate: script.scheduledDate,
      scheduledTime: script.scheduledTime,
      approvalStatus: script.approvalStatus,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT update script status ──────────────────────────────────────────────
router.put("/scripts/:id/status", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({
      _id: req.params.id,
      $or: [{ userId }, { userIds: userId }]
    });

    if (!script) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const { status, note } = req.body;
    const allowed = ["Draft", "Pending", "Waiting", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: "invalid or missing status" });
    }

    if (status === "Objection") {
      script.objectionNote = note || "Objection raised by creator.";
      script.approvalStatus = "Objection";

      // Trigger AI video processing in background asynchronously
      const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");
      triggerAiPipelineForScript(script).catch(err => {
        console.error("[pipeline-trigger-async-error]", err.message);
      });
    } else if (status === "Editing") {
      script.approvalStatus = "Editing";
      script.processingStatus = "processing";
      script.processingProgress = 10;

      // Trigger AI video processing in background
      const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");
      triggerAiPipelineForScript(script).catch(err => {
        console.error("[pipeline-trigger-async-error]", err.message);
      });
    } else {
      script.approvalStatus = status;
    }

    script.statusHistory.push({
      status,
      changedBy: "Creator",
      note: note || `Status updated to ${status} by Creator`
    });
    await script.save();

    return res.json({
      scriptId: script._id.toString(),
      approvalStatus: script.approvalStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST accept assigned script ──────────────────────────────────────────
router.post("/scripts/:id/accept", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({
      _id: req.params.id,
      $or: [{ userId }, { userIds: userId }]
    });

    if (!script) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    // Must be in Pending or Waiting status to accept
    if (script.approvalStatus !== "Pending" && script.approvalStatus !== "Waiting") {
      return res.status(400).json({ error: "Script is not in a pending state to accept" });
    }

    script.approvalStatus = "Submitted";
    script.statusHistory.push({
      status: "Submitted",
      changedBy: "Creator",
      note: "Creator accepted the script."
    });
    await script.save();

    return res.json({
      success: true,
      scriptId: script._id.toString(),
      approvalStatus: script.approvalStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST upload raw video and trigger AI video editing pipeline ──────────
const { videoUpload } = require("../middleware/upload");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");

router.post("/scripts/:id/upload-video", videoUpload.single("video"), async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({
      _id: req.params.id,
      $or: [{ userId }, { userIds: userId }]
    });

    if (!script) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    // Must be in Submitted or Objection status to upload video
    const allowedStatuses = ["Submitted", "Objection", "Draft", "Approved", "Rejected", "Pending", "Waiting"]; // allow any as fallback, but let's warn
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    if (!isR2Configured()) {
      return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    }

    console.log(`[creator-upload] Uploading raw video to R2 for script "${script.title}"...`);
    const uploaded = await uploadToR2(req.file, "scripts/videos/raw");
    
    script.rawVideoUrl = uploaded.url;
    script.processingStatus = "none";
    script.processingProgress = 0;
    script.approvalStatus = "Submitted";
    
    script.statusHistory.push({
      status: "Submitted",
      changedBy: "Creator",
      note: "Creator uploaded raw video. Awaiting approval or AI edit request."
    });
    await script.save();

    return res.json({
      success: true,
      scriptId: script._id.toString(),
      rawVideoUrl: script.rawVideoUrl,
      approvalStatus: script.approvalStatus,
      processingStatus: script.processingStatus
    });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") {
      return res.status(400).json({ error: "Invalid video file type. Only standard formats (mp4, webm, mov, avi) are allowed." });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ── POST generate script using AI ──────────────────────────────────────────
router.post("/generate-script", async (req, res) => {
  try {
    const userId = req.user.sub;
    const { title, category, duration, description } = req.body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI service not configured on the backend" });
    }

    const targetCategory = category || "Motivation";
    const targetDuration = duration || "45s";

    const systemPrompt = `You are a professional speechwriter and copywriter. You write speech scripts for leaders, CEOs, and influencers.
Your task is to write a script based on the topic/title, category, target duration, and context/description provided.
If no topic/title is provided, choose an interesting, creative, or viral topic appropriate for the category.
Make the speech engaging, structured, and natural for speech/reading from a teleprompter.
Provide a refined/improved title and the complete script body content.
Respond with ONLY a valid JSON object in exactly this structure:
{
  "title": "A refined/improved title of the script",
  "body": "The complete script body content"
}`;

    const userPrompt = `Category: ${targetCategory}
Target Duration: ${targetDuration}
Topic/Title: ${title ? title.trim() : "Any creative trending topic under the category"}
Context/Description: ${description || "No specific description provided"}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    const data = await groqRes.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const result = JSON.parse(data.choices[0].message.content);
    const finalTitle = (result.title || title || "Untitled AI Script").trim();
    const finalBody = (result.body || "").trim();

    // Auto-calculate duration from generated body text
    const wordsCount = finalBody.split(/\s+/).length;
    const calculatedSecs = Math.max(15, Math.round((wordsCount / 130) * 60));
    const finalDuration = `${calculatedSecs}s`;

    const { CEO } = require("../models/CEO");
    const { Candidate } = require("../models/Candidate");
    const creator = (await CEO.findById(userId)) || (await Candidate.findById(userId));
    const appId = creator ? creator.appId : null;

    const script = await Script.create({
      userId,
      userIds: [userId],
      appId,
      title: finalTitle,
      body: finalBody,
      description: description ? description.trim() : null,
      category: targetCategory,
      duration: finalDuration,
      scheduledDate: "Self-scheduled",
      scheduledTime: "Self-scheduled",
      approvalStatus: "Draft"
    });

    return res.status(201).json({
      scriptId: script._id.toString(),
      userId: script.userId ? script.userId.toString() : null,
      userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
      title: script.title,
      body: script.body,
      description: script.description || null,
      category: script.category,
      duration: script.duration,
      scheduledDate: script.scheduledDate,
      scheduledTime: script.scheduledTime,
      approvalStatus: script.approvalStatus,
      createdAt: script.createdAt
    });
  } catch (err) {
    console.error("[generate-script-error]", err.message);
    return res.status(500).json({ error: err.message || "Failed to generate script" });
  }
});

// ── PUT update script ─────────────────────────────────────────────────────
router.put("/scripts/:id", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({ _id: req.params.id, userId, createdByAdmin: { $ne: true } });

    if (!script) {
      return res.status(404).json({ error: "Script not found or access denied" });
    }

    const { title, body, description, category, duration, scheduledDate, scheduledTime } = req.body;
    if (title !== undefined) script.title = title.trim();
    if (body !== undefined) script.body = body.trim();
    if (description !== undefined) script.description = description ? description.trim() : null;
    if (category !== undefined) script.category = category.trim();
    if (duration !== undefined) script.duration = duration;
    if (scheduledDate !== undefined) script.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) script.scheduledTime = scheduledTime;

    await script.save();

    return res.json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userId: script.userId ? script.userId.toString() : null,
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        createdAt: script.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE script ─────────────────────────────────────────────────────────
router.delete("/scripts/:id", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne({ _id: req.params.id, userId, createdByAdmin: { $ne: true } });

    if (!script) {
      return res.status(404).json({ error: "Script not found or access denied" });
    }

    await Script.findByIdAndDelete(req.params.id);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = { personalityScriptsRouter: router };
