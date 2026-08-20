const axios = require("axios");
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
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers }
    );
    const conversations = res.data?.data?.conversations || res.data?.conversations || [];
    
    console.log("Checking recent messages for all active conversations:");
    for (const conv of conversations) {
      const messagesRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${conv._id || conv.id}/messages`,
        { headers }
      );
      const messages = messagesRes.data?.data?.messages || messagesRes.data?.messages || [];
      
      // Filter messages sent today (Aug 20) around campaign time
      const todayMsgs = messages.filter(m => m.createdAt.startsWith("2026-08-20T09:17") || m.createdAt.startsWith("2026-08-20T09:16"));
      todayMsgs.forEach(m => {
        console.log(`- To: ${m.to} (${conv.customerName}) | Body: ${m.body} | Status: ${m.status} | CreatedAt: ${m.createdAt}`);
      });
    }
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
