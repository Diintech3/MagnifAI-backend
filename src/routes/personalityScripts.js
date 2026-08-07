const express = require("express");
const { Script } = require("../models/Script");

const router = express.Router();
const { createPlan } = require("../services/calendarService");

// Helper function to sync scheduled scripts with Daily Planner
async function syncScriptToDailyPlanner(script) {
  try {
    if (!script.scheduledDate || script.scheduledDate === "Self-scheduled") return;
    if (!script.scheduledTime || script.scheduledTime === "Self-scheduled") return;

    let dateStr = script.scheduledDate;
    let timeStr = script.scheduledTime;

    // Parse date safely
    const parsedDate = new Date(dateStr);
    let planDate = dateStr;
    if (!isNaN(parsedDate.getTime())) {
      const yyyy = parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      planDate = `${yyyy}-${mm}-${dd}`;
    } else {
      const clean = dateStr.replace(/,/g, "").trim();
      const parts = clean.split(/\s+/);
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const monthIdx = parts.findIndex(p => months[p.toLowerCase().substring(0, 3)] !== undefined);
      if (monthIdx !== -1) {
        const monthVal = months[parts[monthIdx].toLowerCase().substring(0, 3)];
        const dayVal = Number(parts[monthIdx - 1]) || Number(parts[monthIdx + 1]);
        const yearVal = Number(parts[parts.length - 1]);
        if (dayVal && yearVal) {
          const d = new Date(yearVal, monthVal, dayVal);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          planDate = `${yyyy}-${mm}-${dd}`;
        }
      }
    }

    // Parse time safely
    let planTime = "09:00";
    if (timeStr) {
      const ampmMatch = timeStr.match(/(am|pm)/i);
      const timeParts = timeStr.replace(/(am|pm)/i, "").trim().split(":");
      let hr = Number(timeParts[0]);
      let min = timeParts[1] || "00";
      if (ampmMatch) {
        const isPm = ampmMatch[0].toLowerCase() === "pm";
        if (isPm && hr < 12) hr += 12;
        if (!isPm && hr === 12) hr = 0;
      }
      planTime = `${String(hr).padStart(2, '0')}:${min}`;
    }

    // Determine if script was assigned by admin or self-created
    const isAssigned = script.createdByAdmin === true;
    const titlePrefix = isAssigned ? "[Assigned Shoot]" : "[My Shoot]";

    // Sync to Daily Planner via calendarService
    await createPlan({
      title: `${titlePrefix} ${script.title}`,
      description: isAssigned
        ? `Admin-assigned UGC Script: ${script.description || script.title}`
        : `Self-created UGC Script: ${script.description || script.title}`,
      category: "ugc",
      plan_date: planDate,
      plan_time: planTime
    });
    console.log(`[planner-sync] Script "${script.title}" synced successfully to Daily Planner: ${planDate} at ${planTime}.`);
  } catch (err) {
    console.error(`[planner-sync-error] Failed to sync script "${script.title}" to Daily Planner:`, err.message);
  }
}

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
    const { title, body, category, description, scheduledDate, scheduledTime } = req.body;

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
      scheduledDate: scheduledDate || "Self-scheduled",
      scheduledTime: scheduledTime || "Self-scheduled",
      approvalStatus: "Pending"
    });

    // Sync script to Daily Planner
    await syncScriptToDailyPlanner(script);

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

// ── GET script count summary by status ───────────────────────────────────
router.get("/scripts/summary", async (req, res) => {
  try {
    const userId = req.user.sub;
    const userObjectId = new (require("mongoose").Types.ObjectId)(userId);

    const pipeline = [
      {
        $match: {
          $or: [{ userId: userObjectId }, { userIds: userObjectId }]
        }
      },
      {
        $group: {
          _id: "$approvalStatus",
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Script.aggregate(pipeline);

    // Build summary object with all possible statuses
    const allStatuses = ["Draft", "Pending", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection"];
    const summary = {};
    let total = 0;

    for (const status of allStatuses) {
      summary[status] = 0;
    }

    for (const row of results) {
      if (row._id) {
        summary[row._id] = row.count;
        total += row.count;
      }
    }

    summary.total = total;

    return res.json(summary);
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
      userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
      title: script.title,
      body: script.body,
      description: script.description || null,
      category: script.category,
      duration: script.duration,
      scheduledDate: script.scheduledDate,
      scheduledTime: script.scheduledTime,
      approvalStatus: script.approvalStatus,
      imageUrl: script.imageUrl,
      rawVideoUrl: script.rawVideoUrl,
      processedVideoUrl: script.processedVideoUrl,
      viralVideoUrl: script.viralVideoUrl,
      processingStatus: script.processingStatus,
      processingProgress: script.processingProgress,
      objectionNote: script.objectionNote,
      createdByAdmin: script.createdByAdmin || false,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET lightweight AI processing progress of specific script ───────────
router.get("/scripts/:id/progress", async (req, res) => {
  try {
    const userId = req.user.sub;
    const script = await Script.findOne(
      { _id: req.params.id, $or: [{ userId }, { userIds: userId }] },
      "processingStatus processingProgress processedVideoUrl viralVideoUrl approvalStatus"
    );

    if (!script) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({
      scriptId: script._id.toString(),
      approvalStatus: script.approvalStatus,
      processingStatus: script.processingStatus || "none",
      processingProgress: script.processingProgress || 0,
      processedVideoUrl: script.processedVideoUrl || null,
      viralVideoUrl: script.viralVideoUrl || null
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

    const { status, note, sendMode, clearVideo } = req.body;
    const allowed = ["Draft", "Pending", "Waiting", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection", "Recorded", "Retake"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: "invalid or missing status" });
    }

    if (clearVideo) {
      script.rawVideoUrl = null;
      script.processedVideoUrl = null;
      script.viralVideoUrl = null;
      script.processingStatus = "none";
      script.processingProgress = 0;
      script.objectionNote = null;
      script.approvalStatus = "Draft";
    }

    let triggerPipeline = false;
    if (status === "Editing") {
      // Creator requests AI Edit. This is only allowed if raw video is approved (approvalStatus === "Submitted")
      if (script.approvalStatus !== "Submitted") {
        return res.status(400).json({ error: "Video must be approved by admin (status: Submitted) before requesting AI editing." });
      }
      script.approvalStatus = "Editing";
      script.processingStatus = "processing";
      script.processingProgress = 10;
      if (sendMode) {
        script.sendMode = sendMode;
      }
      triggerPipeline = true;
    } else if (status === "Objection") {
      script.objectionNote = note || "Objection raised by creator.";
      script.approvalStatus = "Objection";
      triggerPipeline = true;
    } else {
      script.approvalStatus = status;
    }

    script.statusHistory.push({
      status,
      changedBy: "Creator",
      note: note || `Status updated to ${status} by Creator`
    });
    await script.save();

    if (triggerPipeline) {
      const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");
      triggerAiPipelineForScript(script._id.toString()).catch(err => {
        console.error("[pipeline-trigger-async-error]", err.message);
      });
    }

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

    script.approvalStatus = "Draft";
    script.statusHistory.push({
      status: "Draft",
      changedBy: "Creator",
      note: "Creator accepted the script."
    });
    await script.save();

    // Sync script template schedule to Daily Planner upon acceptance
    await syncScriptToDailyPlanner(script);

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
    
    const { CEO } = require("../models/CEO");
    const { Candidate } = require("../models/Candidate");
    let creatorObj = await CEO.findById(userId);
    if (!creatorObj) {
      creatorObj = await Candidate.findById(userId);
    }
    const resolvedAdminReviewMode = creatorObj?.adminReviewMode || "manual";

    if (resolvedAdminReviewMode === "auto") {
      script.approvalStatus = "Submitted";
      script.processingStatus = "none";
      script.processingProgress = 0;
      script.statusHistory.push({
        status: "Submitted",
        changedBy: "System (Auto-Approve Raw Video)",
        note: "Creator uploaded raw video. Auto-verification is active. Ready for Creator actions."
      });
    } else {
      script.approvalStatus = "Recorded";
      script.processingStatus = "none";
      script.processingProgress = 0;
      script.statusHistory.push({
        status: "Recorded",
        changedBy: "Creator",
        note: "Creator uploaded raw video. Waiting for Admin raw video approval."
      });
    }
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
      approvalStatus: "Pending"
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

    // Sync updated script schedule to Daily Planner
    await syncScriptToDailyPlanner(script);

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
