const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const handshakeRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    {
      apiSharingKey: partnerKey,
      accessToken: clientToken,
      referenceKey: ref
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    }
  );
  const token = handshakeRes.data?.token || handshakeRes.data?.data?.token || handshakeRes.data?.data?.accessToken || handshakeRes.data?.accessToken;

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId,
    "Content-Type": "application/json"
  };

  const convRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`, { headers });
  const conversations = convRes.data?.data?.conversations || convRes.data?.conversations || [];
  
  console.log("Conversations Count:", conversations.length);
  if (conversations.length > 0) {
    console.log("Keys in conversation object:", Object.keys(conversations[0]));
    console.log("First conversation data:", JSON.stringify(conversations[0], null, 2));
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
