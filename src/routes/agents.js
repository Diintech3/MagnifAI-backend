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
  analyzeDevice,
  askAgent,
  publicAskAgent,
  uploadChatFile,
  testVoiceSettings,
  submitAgentFeedback,
  getAgentFeedbacks,
  registerSubUser,
  loginSubUser,
  addFaqToAgent
} = require("../services/agentAiService");

const { bookMeetingViaSubAgent, getBookedDates } = require("../services/calendarService");
const { logoUpload } = require("../middleware/upload");
const { uploadToR2, isR2Configured } = require("../utils/r2");

// ── Token Resolution Helper Functions ──────────────────────────────────────

async function getContextToken(req) {
  if (req && req.user && req.user.role === "CEO") {
    try {
      const { CEO } = require("../models/CEO");
      const ceo = await CEO.findById(req.user.sub);
      if (ceo && ceo.ragToken) {
        return ceo.ragToken;
      }
    } catch (err) {
      console.error("[getContextToken-error]", err.message);
    }
  }
  return undefined;
}

async function resolveTokenByAgentId(agentId) {
  if (!agentId) return undefined;
  try {
    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findOne({ agentId });
    if (ceo && ceo.ragToken) {
      return ceo.ragToken;
    }
  } catch (err) {
    console.error("[resolveTokenByAgentId-error]", err.message);
  }
  return undefined;
}

async function resolveToken(req, agentId) {
  let token = undefined;
  if (agentId) {
    token = await resolveTokenByAgentId(agentId);
  }
  if (!token && req) {
    token = await getContextToken(req);
  }
  return token;
}

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
    const clientToken = await resolveToken(req, agent_id);
    const details = await getAgentDetails(agent_id, clientToken);
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
    const clientToken = await resolveToken(req, agent_id);
    const data = await publicAskAgent(agent_id, req.body, clientToken);
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

    const clientToken = await resolveToken(req, agent_id);
    const { baseUrl, token: defaultToken } = getRequestConfig();
    const token = clientToken || defaultToken;
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
    const clientToken = await resolveToken(req, agent_id);
    const data = await getPublicVisitorHistory(agent_id, device_id, session_id, clientToken);
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
    const clientToken = await resolveToken(req, agent_id);
    const data = await getPublicSessionStatus(agent_id, device_id, session_id, clientToken);
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

    const clientToken = await resolveToken(req, agent_id);
    const data = await submitAgentFeedback(agent_id, req.body, clientToken);
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
    const token = await resolveToken(req);
    const data = await listAgents(token);
    const origin = req.headers.origin || "http://localhost:5173";
    const enriched = (data || []).map(agent => {
      const customLink = agent.customization && agent.customization.chat_link;
      const chatLink = (customLink && customLink.trim())
        ? customLink.trim()
        : `${origin}/agent-chat?id=${agent.agent_id}`;
      return {
        ...agent,
        publicChatUrl: chatLink,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(chatLink)}`
      };
    });
    return res.json(enriched);
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
    const token = await resolveToken(req);
    const data = await createAgent(req.body, token);
    if (req.user.role === "CEO" && req.body.category === "root_assistant") {
      const { CEO } = require("../models/CEO");
      await CEO.findByIdAndUpdate(req.user.sub, { agentId: data.agent_id });
    }
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
    const token = await resolveToken(req);
    const data = await testVoiceSettings(req.body, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await getAgentDetails(agent_id, token);
    const origin = req.headers.origin || "http://localhost:5173";
    if (data) {
      const customLink = data.customization && data.customization.chat_link;
      const chatLink = (customLink && customLink.trim())
        ? customLink.trim()
        : `${origin}/agent-chat?id=${data.agent_id}`;
      data.publicChatUrl = chatLink;
      data.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(chatLink)}`;
    }
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
    const token = await resolveToken(req, agent_id);
    const data = await updateAgent(agent_id, req.body, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await deleteAgent(agent_id, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await uploadPdfToAgent(
      agent_id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      token
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
    const token = await resolveToken(req, agent_id);
    const data = await ingestUrlToAgent(agent_id, url, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "INGEST_URL_ERROR", message: err.message });
  }
});

/**
 * Add FAQ (Q&A pair) to agent customization
 * POST /api/agents/:agent_id/faq
 */
router.post("/:agent_id/faq", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { q, a } = req.body;
    if (!q || !a) {
      return res.status(400).json({ error: "QUESTION_AND_ANSWER_REQUIRED" });
    }
    const token = await resolveToken(req, agent_id);
    const data = await addFaqToAgent(agent_id, q, a, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ADD_FAQ_ERROR", message: err.message });
  }
});

/**
 * Remove training source from Agent KB
 * DELETE /api/agents/:agent_id/sources/:source_id
 */
router.delete("/:agent_id/sources/:source_id", async (req, res) => {
  try {
    const { agent_id, source_id } = req.params;
    const token = await resolveToken(req, agent_id);
    const data = await removeSourceFromAgent(agent_id, source_id, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await getVisitorSessions(agent_id, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await getVisitorUserSessions(agent_id, token);
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
    const token = await resolveToken(req);
    const data = await getSessionHistory(session_id, token);
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
    const token = await resolveToken(req);
    const data = await analyzeSession(session_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ANALYZE_SESSION_ERROR", message: err.message });
  }
});

/**
 * Run Holistic AI Analysis on a visitor device (merges all sessions)
 * POST /api/agents/sessions/analyze-device
 */
router.post("/sessions/analyze-device", async (req, res) => {
  try {
    const { agent_id, device_id } = req.body;
    if (!agent_id || !device_id) {
      return res.status(400).json({ error: "AGENT_ID_AND_DEVICE_ID_REQUIRED" });
    }
    const token = await resolveToken(req, agent_id);
    const data = await analyzeDevice(agent_id, device_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ANALYZE_DEVICE_ERROR", message: err.message });
  }
});

/**
 * Upload visitor chat file (Image, PDF, Video, Doc) and get extracted text
 * POST /api/agents/:agent_id/upload-chat-file
 */
router.post("/:agent_id/upload-chat-file", pdfUpload.single("file"), async (req, res) => {
  try {
    const { agent_id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "FILE_REQUIRED" });
    }
    const token = await resolveToken(req, agent_id);
    const data = await uploadChatFile(
      agent_id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      token
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "UPLOAD_CHAT_FILE_ERROR", message: err.message });
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
    const token = await resolveToken(req, agent_id);
    const data = await askAgent(agent_id, question, history || [], !!is_voice, token);
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
    const token = await resolveToken(req);
    const data = await sendSessionAction(session_id, req.body, token);
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
    const token = await resolveToken(req);
    const data = await clearSessionAction(session_id, token);
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
    const token = await resolveToken(req, agent_id);
    const data = await getAgentFeedbacks(agent_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_FEEDBACKS_ERROR", message: err.message });
  }
});

/**
 * Book Meeting via Sub-Agent
 * POST /api/agents/:agent_id/book-meeting
 */
router.post("/:agent_id/book-meeting", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const token = await resolveToken(req, agent_id);
    const data = await bookMeetingViaSubAgent(agent_id, req.body, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "BOOK_MEETING_ERROR", message: err.message });
  }
});

/**
 * Get Booked Dates & Planner Slots
 * GET /api/agents/:agent_id/booked-dates
 */
router.get("/:agent_id/booked-dates", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const token = await resolveToken(req, agent_id);
    const data = await getBookedDates(agent_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_BOOKED_DATES_ERROR", message: err.message });
  }
});

// ── Reseller Sub-User (Client) Admin Onboarding Routes ──────────────────────

/**
 * Register a new sub-user (client) on RAG and link to CEO
 * POST /api/agents/clients/register
 */
router.post("/clients/register", async (req, res) => {
  try {
    const { ceoId, name, email, password, business_name, website_url, gst_number, pan_number, user_type, mobile_number, city, pin_code, address, dob, profession, logo_url } = req.body;
    if (!ceoId) {
      return res.status(400).json({ error: "CEO_ID_REQUIRED" });
    }

    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(ceoId);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    // Call RAG sub-user registration
    const data = await registerSubUser({
      name: name || ceo.name,
      email: email || ceo.email,
      password: password || "tempPassword123!", // dynamic or fallback
      business_name: business_name || ceo.company || ceo.name,
      website_url: website_url || ceo.website || "",
      gst_number: gst_number || "",
      pan_number: pan_number || "",
      user_type: user_type || "Prime",
      mobile_number: mobile_number || ceo.mobile || "",
      city: city || ceo.city || "",
      pin_code: pin_code || ceo.pincode || "",
      address: address || ceo.address || "",
      dob: dob || "1990-01-01",
      profession: profession || ceo.designation || "",
      logo_url: logo_url || ceo.photoUrl || ""
    });

    if (data && data.success && data.user) {
      // Store returned credentials back to CEO
      await CEO.findByIdAndUpdate(ceoId, {
        ragClientId: data.user.client_id,
        ragToken: data.user.token
      });
      return res.json({ success: true, user: data.user });
    }

    return res.status(500).json({ error: "REGISTRATION_FAILED", message: data.message || "Unknown RAG registration error" });
  } catch (err) {
    return res.status(500).json({ error: "CLIENT_REGISTER_ERROR", message: err.message });
  }
});

/**
 * Log in a sub-user on RAG to fetch/refresh token
 * POST /api/agents/clients/login
 */
router.post("/clients/login", async (req, res) => {
  try {
    const { email, password, ceoId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
    }

    const data = await loginSubUser({ email, password });
    if (data && data.token) {
      if (ceoId) {
        const { CEO } = require("../models/CEO");
        await CEO.findByIdAndUpdate(ceoId, {
          ragClientId: data.client_id,
          ragToken: data.token
        });
      }
      return res.json({ success: true, token: data.token, client_id: data.client_id });
    }

    return res.status(401).json({ error: "LOGIN_FAILED", message: data.message || "Invalid credentials" });
  } catch (err) {
    return res.status(500).json({ error: "CLIENT_LOGIN_ERROR", message: err.message });
  }
});

module.exports = { agentsRouter: router };
