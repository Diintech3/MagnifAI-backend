const axios = require("axios");
const FormData = require("form-data");
const { env } = require("../config/env");

function getCleanErrorMessage(err) {
  if (!err) return "";
  let details = "";
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === "string") {
      if (data.includes("<html") || data.includes("<!DOCTYPE")) {
        const payloadMatch = data.match(/data-payload="([^"]+)"/);
        if (payloadMatch) {
          try {
            const decoded = JSON.parse(Buffer.from(payloadMatch[1], "base64").toString("utf-8"));
            details = ` (${decoded.message || decoded.title})`;
          } catch (e) {
            // ignore
          }
        }
        if (!details) {
          const noscriptMatch = data.match(/<noscript>(.*?)<\/noscript>/);
          if (noscriptMatch) {
            details = ` (${noscriptMatch[1].replace(/<[^>]*>/g, "").trim()})`;
          }
        }
        if (!details) {
          details = ` [HTML response: ${data.length} chars]`;
        }
      } else {
        details = ` (${data.slice(0, 200)})`;
      }
    } else if (typeof data === "object") {
      details = ` (${JSON.stringify(data)})`;
    }
  }
  return `${err.message}${details}`;
}

function isAiConfigured() {
  return Boolean(env.UGC_AI_BASE_URL && env.UGC_AI_APP_TOKEN);
}

function getRequestConfig() {
  if (!isAiConfigured()) {
    throw new Error("UGC AI configuration (URL/Token) is missing");
  }
  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;
  return { baseUrl, token };
}

// ── Agent CRUD ───────────────────────────────────────────────────────────

async function createAgent(agentData) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents`, agentData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-create-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function updateAgent(agentId, agentData) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.patch(`${baseUrl}/api/agents/${agentId}`, agentData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-update-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function listAgents() {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-list-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function getAgentDetails(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-detail-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function deleteAgent(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.delete(`${baseUrl}/api/agents/${agentId}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-delete-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

// ── Knowledge Base ────────────────────────────────────────────────────────

async function uploadPdfToAgent(agentId, fileBuffer, filename, mimetype) {
  const { baseUrl, token } = getRequestConfig();
  const form = new FormData();
  form.append("file", fileBuffer, { filename, contentType: mimetype });

  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/upload-pdf`, form, {
      headers: {
        "X-App-Token": token,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minutes
    });
    return res.data;
  } catch (err) {
    console.error("[agent-upload-pdf-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function ingestUrlToAgent(agentId, url) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/ingest-url`, { url }, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-ingest-url-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function removeSourceFromAgent(agentId, sourceId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.delete(`${baseUrl}/api/agents/${agentId}/sources/${sourceId}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-remove-source-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

// ── Sessions & Analytics ──────────────────────────────────────────────────

async function getVisitorSessions(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/sessions`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-sessions-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function getSessionHistory(sessionId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/sessions/${sessionId}/history`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-session-history-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function analyzeSession(sessionId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/sessions/${sessionId}/analyze`, {}, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-session-analyze-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

// ── Ask Chat ──────────────────────────────────────────────────────────────

async function askAgent(agentId, question, history, isVoice = false) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/ask`, {
      question,
      history,
      is_voice: isVoice
    }, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-ask-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function publicAskAgent(agentId, payload) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/public-ask`, payload, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-public-ask-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

// ── Voice / Speak ──────────────────────────────────────────────────────────

async function getSpeakStreamUrl(agentId, text) {
  const { baseUrl, token } = getRequestConfig();
  return `${baseUrl}/api/agents/${agentId}/speak?text=${encodeURIComponent(text)}`;
}

async function testVoiceSettings(voiceConfig) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/test-voice`, voiceConfig, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" },
      responseType: "arraybuffer"
    });
    return res.data;
  } catch (err) {
    console.error("[agent-test-voice-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

module.exports = {
  isAiConfigured,
  createAgent,
  updateAgent,
  listAgents,
  getAgentDetails,
  deleteAgent,
  uploadPdfToAgent,
  ingestUrlToAgent,
  removeSourceFromAgent,
  getVisitorSessions,
  getSessionHistory,
  analyzeSession,
  askAgent,
  publicAskAgent,
  getSpeakStreamUrl,
  testVoiceSettings
};
