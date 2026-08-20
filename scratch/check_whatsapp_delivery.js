const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO not found.");
    process.exit(1);
  }

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
  
  if (!token) {
    console.error("Handshake failed.");
    process.exit(1);
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId,
    "Content-Type": "application/json"
  };

  try {
    const convRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`, { headers });
    const conversations = convRes.data?.data?.conversations || convRes.data?.conversations || [];
    console.log(`Found ${conversations.length} conversations.`);

    for (const c of conversations) {
      console.log(`\n--- Conversation: ${c.customerName || c.phone} (${c.phone}) ---`);
      console.log(`Status: ${c.status}, Unread: ${c.unreadCount}`);
      
      const msgRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${c._id || c.id}/messages?limit=10`, { headers });
      const messages = msgRes.data?.data?.messages || msgRes.data?.messages || [];
      console.log(`Last ${messages.length} messages:`);
      messages.forEach(m => {
        console.log(`- [${m.direction}] [${m.type}] Status: ${m.status}, Body preview: "${m.body || ""}", ErrorReason: "${m.errorReason || "none"}"`);
      });
    }
  } catch (err) {
    console.error("Error fetching conversations/messages:", err.response?.data || err.message);
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
