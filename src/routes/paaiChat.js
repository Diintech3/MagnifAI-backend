const express = require("express");
const axios = require("axios");
const { env } = require("../config/env");
const { CEO } = require("../models/CEO");
const { askRootAgentChat } = require("../services/calendarService");

const paaiChatRouter = express.Router();

// Helper to resolve the CEO and their root agentId / token
async function getCeoDetails(req) {
  const ceoId = req.user.sub;
  const ceo = await CEO.findById(ceoId);
  if (!ceo || !ceo.agentId) {
    throw new Error("ROOT_AGENT_NOT_CONFIGURED");
  }
  return { agentId: ceo.agentId, token: ceo.ragToken };
}

// Helper to get request config for TTS speak streaming
function getRequestConfig() {
  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;
  return { baseUrl, token };
}

/**
 * Chat Ask Endpoint for Root Agent
 * POST /api/paai-chat/ask
 */
paaiChatRouter.post("/ask", async (req, res) => {
  try {
    const { question, history, session_id } = req.body;
    if (!question) {
      return res.status(400).json({ error: "QUESTION_REQUIRED" });
    }

    const { agentId, token } = await getCeoDetails(req);
    const resolvedSessionId = session_id || `root_sess_${agentId}`;

    const chatPayload = {
      message: question,
      session_id: resolvedSessionId,
      history: history || []
    };

    const data = await askRootAgentChat(chatPayload, token);
    return res.json(data);
  } catch (err) {
    console.error("[paai-chat-ask-error]", err.message);
    if (err.message === "ROOT_AGENT_NOT_CONFIGURED") {
      return res.status(404).json({ error: "ROOT_AGENT_NOT_CONFIGURED", message: "CEO root agent not configured." });
    }
    return res.status(500).json({ error: "ASK_ERROR", message: err.message });
  }
});

/**
 * Text-to-Speech Speak Endpoint for Root Agent
 * GET /api/paai-chat/speak
 */
paaiChatRouter.get("/speak", async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ error: "TEXT_REQUIRED" });
    }

    const { agentId, token: clientToken } = await getCeoDetails(req);
    const { baseUrl, token: defaultToken } = getRequestConfig();
    const token = clientToken || defaultToken;
    const externalSpeakUrl = `${baseUrl}/api/agents/${agentId}/speak?text=${encodeURIComponent(text)}`;

    const response = await axios.get(externalSpeakUrl, {
      headers: { "X-App-Token": token },
      responseType: "stream"
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    response.data.pipe(res);
  } catch (err) {
    console.error("[paai-chat-speak-error]", err.message);
    if (err.message === "ROOT_AGENT_NOT_CONFIGURED") {
      return res.status(404).json({ error: "ROOT_AGENT_NOT_CONFIGURED", message: "CEO root agent not configured." });
    }
    return res.status(500).json({ error: "SPEAK_ERROR", message: err.message });
  }
});

module.exports = { paaiChatRouter };
