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

  const phone = "917970906978";
  
  try {
    const convsRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers }
    );
    const conversations = convsRes.data?.data?.conversations || convsRes.data?.conversations || [];
    const conv = conversations.find(c => c.customerPhone === phone);
    if (!conv) {
      console.log(`No conversation found for phone ${phone}.`);
      return;
    }

    const messagesRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${conv._id || conv.id}/messages`,
      { headers }
    );
    const messages = messagesRes.data?.data?.messages || messagesRes.data?.messages || [];
    
    console.log("Details of failed messages:");
    messages.forEach(m => {
      if (m.status === "failed") {
        console.log(`- ID: ${m._id} | Body: ${m.body} | ErrorReason: "${m.errorReason}" | Raw Message:`, JSON.stringify(m, null, 2));
      }
    });
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
