const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const loginRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } }
  );
  const jwtToken = loginRes.data?.token || loginRes.data?.data?.token;

  const clientId = "6a66f2c106372d3b8ea6b902"; // Lakshami Raj Singh
  const headers = {
    "Authorization": `Bearer ${jwtToken}`,
    "x-api-key": partnerKey,
    "x-client-id": clientId,
    "Content-Type": "application/json"
  };

  // Get conversations list to find Deva Singh Rajput's conversation ID
  const convRes = await axios.get(
    `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
    { headers }
  );
  const convs = convRes.data?.data?.conversations || convRes.data?.conversations || [];
  console.log("Found conversations:", convs.length);
  const devaConv = convs[0];
  if (devaConv) {
    console.log("Conv ID:", devaConv._id || devaConv.id);
    const msgRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${devaConv._id || devaConv.id}/messages`,
      { headers }
    );
    console.log("=== ACTUAL WHATSAI MESSAGE OBJECTS ===");
    console.log(JSON.stringify(msgRes.data, null, 2));
  }
}

main().catch(console.error);
