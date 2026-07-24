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

// Helper function to sanitize session lead info (clean up invalid names/phones extracted by AI)
function sanitizeSessionItem(session) {
  if (!session || typeof session !== "object") return session;
  const item = { ...session };

  if (item.phone_number) {
    const raw = String(item.phone_number).trim();
    const digitCount = (raw.match(/\d/g) || []).length;
    if (digitCount < 7 || raw.toLowerCase() === "none" || /[a-zA-Z]{3,}/.test(raw)) {
      item.phone_number = "None";
    }
  } else {
    item.phone_number = "None";
  }

  if (item.user_name) {
    const rawName = String(item.user_name).trim();
    const isQuestionOrSentence = rawName.endsWith("?") || /^(what|how|why|when|where|who|is|can|do|hello|hi|mera|nice|thanks)\b/i.test(rawName);
    if (isQuestionOrSentence || rawName === item.phone_number || rawName.length > 50) {
      item.user_name = "Anonymous Visitor";
    }
  } else {
    item.user_name = "Anonymous Visitor";
  }

  return item;
}

async function getVisitorSessions(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/sessions`, {
      headers: { "X-App-Token": token }
    });
    const data = res.data;
    if (Array.isArray(data)) {
      const sanitized = data.map(sanitizeSessionItem);

      // Step 1: Device-level persistent lead identity resolution
      const deviceMap = {};
      sanitized.forEach(sess => {
        const key = sess.device_id || sess.session_id;
        if (!deviceMap[key]) {
          deviceMap[key] = {
            resolved_name: "Anonymous Visitor",
            resolved_phone: "None",
            sessions: []
          };
        }
        deviceMap[key].sessions.push(sess);
        if (sess.user_name && sess.user_name !== "Anonymous Visitor") {
          deviceMap[key].resolved_name = sess.user_name;
        }
        if (sess.phone_number && sess.phone_number !== "None") {
          deviceMap[key].resolved_phone = sess.phone_number;
        }
      });

      // Step 2: Propagate resolved lead identity and attach visit_count
      return sanitized.map(sess => {
        const key = sess.device_id || sess.session_id;
        const group = deviceMap[key];
        return {
          ...sess,
          user_name: (sess.user_name && sess.user_name !== "Anonymous Visitor") ? sess.user_name : group.resolved_name,
          phone_number: (sess.phone_number && sess.phone_number !== "None") ? sess.phone_number : group.resolved_phone,
          visit_count: group.sessions.length
        };
      });
    }
    return data;
  } catch (err) {
    console.error("[agent-sessions-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function getVisitorUserSessions(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/sessions`, {
      headers: { "X-App-Token": token }
    });
    const data = res.data;
    if (Array.isArray(data)) {
      const sanitized = data.map(sanitizeSessionItem);

      const deviceMap = {};
      sanitized.forEach(sess => {
        const key = sess.device_id || sess.session_id;
        if (!deviceMap[key]) {
          deviceMap[key] = {
            device_id: sess.device_id || key,
            device_name: sess.device_name || "Unknown Device",
            user_name: "Anonymous Visitor",
            phone_number: "None",
            total_visits: 0,
            latest_visit: sess.created_at || sess.updated_at,
            sessions: []
          };
        }

        deviceMap[key].total_visits += 1;
        if (sess.user_name && sess.user_name !== "Anonymous Visitor") {
          deviceMap[key].user_name = sess.user_name;
        }
        if (sess.phone_number && sess.phone_number !== "None") {
          deviceMap[key].phone_number = sess.phone_number;
        }
        if (sess.device_name) {
          deviceMap[key].device_name = sess.device_name;
        }

        deviceMap[key].sessions.push({
          session_id: sess.session_id,
          agent_id: sess.agent_id,
          analysis: sess.analysis || null,
          action_button: sess.action_button || null,
          created_at: sess.created_at,
          updated_at: sess.updated_at
        });
      });

      return Object.values(deviceMap).map(userGroup => ({
        ...userGroup,
        sessions: userGroup.sessions.map(s => ({
          ...s,
          user_name: userGroup.user_name,
          phone_number: userGroup.phone_number
        }))
      }));
    }
    return [];
  } catch (err) {
    console.error("[agent-user-sessions-error]", getCleanErrorMessage(err));
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

async function getPublicVisitorHistory(agentId, deviceId, sessionId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const query = [];
    if (deviceId) query.push(`device_id=${encodeURIComponent(deviceId)}`);
    if (sessionId) query.push(`session_id=${encodeURIComponent(sessionId)}`);
    const qStr = query.length ? `?${query.join("&")}` : "";

    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/public-history${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-public-history-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function getPublicSessionStatus(agentId, deviceId, sessionId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const query = [];
    if (deviceId) query.push(`device_id=${encodeURIComponent(deviceId)}`);
    if (sessionId) query.push(`session_id=${encodeURIComponent(sessionId)}`);
    const qStr = query.length ? `?${query.join("&")}` : "";

    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/session-status${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-session-status-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function sendSessionAction(sessionId, payload) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/sessions/${sessionId}/send-action`, payload, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-send-action-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function clearSessionAction(sessionId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.delete(`${baseUrl}/api/agents/sessions/${sessionId}/clear-action`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-clear-action-error]", getCleanErrorMessage(err));
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

// ── Feedback & Reports ───────────────────────────────────────────────────

async function submitAgentFeedback(agentId, payload) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/feedback`, payload, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-submit-feedback-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function getAgentFeedbacks(agentId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/feedback`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-get-feedbacks-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function analyzeDevice(agentId, deviceId) {
  const { baseUrl, token } = getRequestConfig();
  try {
    const res = await axios.post(`${baseUrl}/api/agents/sessions/analyze-device`, {
      agent_id: agentId,
      device_id: deviceId
    }, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[agent-analyze-device-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

async function uploadChatFile(agentId, fileBuffer, filename, mimetype) {
  const { baseUrl, token } = getRequestConfig();
  const form = new FormData();
  form.append("file", fileBuffer, { filename, contentType: mimetype });

  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/upload-chat-file`, form, {
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
    console.error("[agent-upload-chat-file-error]", getCleanErrorMessage(err));
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
  getSpeakStreamUrl,
  testVoiceSettings,
  submitAgentFeedback,
  getAgentFeedbacks,
  sanitizeSessionItem
};
