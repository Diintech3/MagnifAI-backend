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

  const phone = "919205511185";
  
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

    console.log(`Found conversation details for ${phone}:`, conv);

    const messagesRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${conv._id || conv.id}/messages`,
      { headers }
    );
    const messages = messagesRes.data?.data?.messages || messagesRes.data?.messages || [];
    console.log(`\nLast 5 messages for conversation ${conv._id || conv.id}:`);
    messages.slice(-5).forEach(m => {
      console.log(JSON.stringify(m, null, 2));
    });
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
