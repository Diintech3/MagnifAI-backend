const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const loginRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey } }
  );
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": "6a66f2c106372d3b8ea6b902"
  };

  try {
    const res = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates`,
      { headers }
    );
    const templates = res.data?.data?.templates || res.data?.templates || [];
    const aiAssistant = templates.find(t => t.name === "Ai Assistant" || t.name === "ai_assistant" || t.whatsappTemplateName === "ai_assistant");
    console.log("Ai Assistant template details from Whats AI:");
    console.log(JSON.stringify(aiAssistant, null, 2));
  } catch (e) {
    console.error("Error fetching templates:", e.response?.data || e.message);
  }
}

run();
