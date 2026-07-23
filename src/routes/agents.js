const express = require("express");
const multer = require("multer");
const axios = require("axios");
const { env } = require("../config/env");
const { requireAuth } = require("../middleware/auth");
const {
  createAgent,
  updateAgent,
  listAgents,
  getAgentDetails,
  deleteAgent,
  uploadPdfToAgent,
  ingestUrlToAgent,
  removeSourceFromAgent,
  getVisitorSessions,
  getVisitorUserSessions,
  getSessionHistory,
  getPublicVisitorHistory,
  getPublicSessionStatus,
  sendSessionAction,
  clearSessionAction,
  analyzeSession,
  askAgent,
  publicAskAgent,
  testVoiceSettings,
  submitAgentFeedback,
  getAgentFeedbacks
} = require("../services/agentAiService");

const { logoUpload } = require("../middleware/upload");
const { uploadToR2, isR2Configured } = require("../utils/r2");

const router = express.Router();

// PDF file upload configuration for Memory Storage
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Helper to get request config for local speak stream implementation
function getRequestConfig() {
  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;
  return { baseUrl, token };
}

// ── PUBLIC VISITOR ENDPOINTS (No requireAuth) ─────────────────────────────

/**
 * Visitor Public Config Retrieval - logo, category, brand color etc.
 * GET /api/agents/:agent_id/public-config
 */
router.get("/:agent_id/public-config", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const details = await getAgentDetails(agent_id);
    return res.json({
      name: details.name,
      category: details.category,
      starting_message: details.starting_message,
      customization: details.customization || {}
    });
  } catch (err) {
    return res.status(500).json({ error: "PUBLIC_CONFIG_ERROR", message: err.message });
  }
});

/**
 * Visitor Chat Ask - maps messages to session_id and captures visitor details
 * POST /api/agents/:agent_id/public-ask
 */
router.post("/:agent_id/public-ask", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await publicAskAgent(agent_id, req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "PUBLIC_ASK_ERROR", message: err.message });
  }
});

/**
 * Text-to-Speech Streaming endpoint (Pipes binary audio stream from 3rdAI server)
 * GET /api/agents/:agent_id/speak
 */
router.get("/:agent_id/speak", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ error: "TEXT_REQUIRED" });
    }

    const { baseUrl, token } = getRequestConfig();
    const externalSpeakUrl = `${baseUrl}/api/agents/${agent_id}/speak?text=${encodeURIComponent(text)}`;

    const response = await axios.get(externalSpeakUrl, {
      headers: { "X-App-Token": token },
      responseType: "stream"
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    response.data.pipe(res);
  } catch (err) {
    console.error("[speak-route-error]", err.message);
    return res.status(500).json({ error: "SPEAK_ERROR", message: err.message });
  }
});

/**
 * Get Public Visitor Chat History (Client Side restore on reload)
 * GET /api/agents/:agent_id/public-history
 */
router.get("/:agent_id/public-history", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { device_id, session_id } = req.query;
    const data = await getPublicVisitorHistory(agent_id, device_id, session_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "PUBLIC_HISTORY_ERROR", message: err.message });
  }
});

/**
 * Get Public Session Status (Client Polling for creator action buttons)
 * GET /api/agents/:agent_id/session-status
 */
router.get("/:agent_id/session-status", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { device_id, session_id } = req.query;
    const data = await getPublicSessionStatus(agent_id, device_id, session_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "SESSION_STATUS_ERROR", message: err.message });
  }
});

/**
 * Submit Public Agent Feedback / Report (Automatically resolves user details if authenticated)
 * POST /api/agents/:agent_id/feedback
 */
router.post("/:agent_id/feedback", async (req, res) => {
  try {
    const { agent_id } = req.params;

    // Resolve authenticated user details dynamically if token is present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        if (token) {
          const { verifyAccessToken } = require("../utils/jwt");
          const decoded = verifyAccessToken(token);
          if (decoded) {
            if (decoded.name) req.body.user_name = decoded.name;
            if (decoded.email) req.body.user_email = decoded.email;
          }
        }
      } catch (err) {
        // Soft fail token decoding, keep the manually passed user details
      }
    }

    const data = await submitAgentFeedback(agent_id, req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "SUBMIT_FEEDBACK_ERROR", message: err.message });
  }
});

// ── AUTHENTICATED ENDPOINTS (Requires user authentication) ──────────────────

router.use(requireAuth);

/**
 * List all agents
 * GET /api/agents
 */
router.get("/", async (req, res) => {
  try {
    const data = await listAgents();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "LIST_AGENTS_ERROR", message: err.message });
  }
});

/**
 * Create a new agent
 * POST /api/agents
 */
router.post("/", async (req, res) => {
  try {
    const data = await createAgent(req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "CREATE_AGENT_ERROR", message: err.message });
  }
});

/**
 * Upload logo/avatar image for Agent Customization to Cloudflare R2
 * POST /api/agents/upload-image
 */
router.post("/upload-image", logoUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "IMAGE_REQUIRED" });
    }
    if (!isR2Configured()) {
      return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    }
    const uploaded = await uploadToR2(req.file, "agents/images");
    return res.json({ url: uploaded.url });
  } catch (err) {
    return res.status(500).json({ error: "UPLOAD_IMAGE_ERROR", message: err.message });
  }
});

/**
 * Test Voice configurations
 * POST /api/agents/test-voice
 */
router.post("/test-voice", async (req, res) => {
  try {
    const data = await testVoiceSettings(req.body);
    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(data);
  } catch (err) {
    return res.status(500).json({ error: "TEST_VOICE_ERROR", message: err.message });
  }
});

/**
 * Get Agent Details
 * GET /api/agents/:agent_id
 */
router.get("/:agent_id", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await getAgentDetails(agent_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_AGENT_ERROR", message: err.message });
  }
});

/**
 * Update Agent
 * PATCH /api/agents/:agent_id
 */
router.patch("/:agent_id", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await updateAgent(agent_id, req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "UPDATE_AGENT_ERROR", message: err.message });
  }
});

/**
 * Delete Agent
 * DELETE /api/agents/:agent_id
 */
router.delete("/:agent_id", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await deleteAgent(agent_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "DELETE_AGENT_ERROR", message: err.message });
  }
});

/**
 * Upload PDF training file to agent
 * POST /api/agents/:agent_id/upload-pdf
 */
router.post("/:agent_id/upload-pdf", pdfUpload.single("file"), async (req, res) => {
  try {
    const { agent_id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "FILE_REQUIRED" });
    }
    const data = await uploadPdfToAgent(
      agent_id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "UPLOAD_PDF_ERROR", message: err.message });
  }
});

/**
 * Crawl & Ingest Web URL to agent KB
 * POST /api/agents/:agent_id/ingest-url
 */
router.post("/:agent_id/ingest-url", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL_REQUIRED" });
    }
    const data = await ingestUrlToAgent(agent_id, url);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "INGEST_URL_ERROR", message: err.message });
  }
});

/**
 * Remove training source from Agent KB
 * DELETE /api/agents/:agent_id/sources/:source_id
 */
router.delete("/:agent_id/sources/:source_id", async (req, res) => {
  try {
    const { agent_id, source_id } = req.params;
    const data = await removeSourceFromAgent(agent_id, source_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "REMOVE_SOURCE_ERROR", message: err.message });
  }
});

/**
 * List visitor sessions logged for an agent
 * GET /api/agents/:agent_id/sessions
 */
router.get("/:agent_id/sessions", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await getVisitorSessions(agent_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_SESSIONS_ERROR", message: err.message });
  }
});

/**
 * List visitor sessions grouped by user/device for an agent
 * GET /api/agents/:agent_id/user-sessions
 */
router.get("/:agent_id/user-sessions", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await getVisitorUserSessions(agent_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_USER_SESSIONS_ERROR", message: err.message });
  }
});

/**
 * Get chat messages log for a specific session
 * GET /api/agents/sessions/:session_id/history
 */
router.get("/sessions/:session_id/history", async (req, res) => {
  try {
    const { session_id } = req.params;
    const data = await getSessionHistory(session_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_HISTORY_ERROR", message: err.message });
  }
});

/**
 * Run AI Analysis on a specific session conversation history
 * POST /api/agents/sessions/:session_id/analyze
 */
router.post("/sessions/:session_id/analyze", async (req, res) => {
  try {
    const { session_id } = req.params;
    const data = await analyzeSession(session_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ANALYZE_SESSION_ERROR", message: err.message });
  }
});

/**
 * Private/Workspace RAG ask
 * POST /api/agents/:agent_id/ask
 */
router.post("/:agent_id/ask", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { question, history, is_voice } = req.body;
    if (!question) {
      return res.status(400).json({ error: "QUESTION_REQUIRED" });
    }
    const data = await askAgent(agent_id, question, history || [], !!is_voice);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ASK_ERROR", message: err.message });
  }
});

/**
 * Send Creator Action Button (Call Now / WhatsApp Connect)
 * POST /api/agents/sessions/:session_id/send-action
 */
router.post("/sessions/:session_id/send-action", async (req, res) => {
  try {
    const { session_id } = req.params;
    const data = await sendSessionAction(session_id, req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "SEND_ACTION_ERROR", message: err.message });
  }
});

/**
 * Clear Session Action Button
 * DELETE /api/agents/sessions/:session_id/clear-action
 */
router.delete("/sessions/:session_id/clear-action", async (req, res) => {
  try {
    const { session_id } = req.params;
    const data = await clearSessionAction(session_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "CLEAR_ACTION_ERROR", message: err.message });
  }
});

/**
 * Retrieve Feedback and Reports list for an Agent
 * GET /api/agents/:agent_id/feedback
 */
router.get("/:agent_id/feedback", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await getAgentFeedbacks(agent_id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_FEEDBACKS_ERROR", message: err.message });
  }
});

module.exports = { agentsRouter: router };
