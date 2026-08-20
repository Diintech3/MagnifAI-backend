const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

// Mongoose model for logs
const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true },
    ceoId: { type: mongoose.Schema.Types.ObjectId, ref: "CEO" }
  },
  { strict: false }
);
const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog || mongoose.model("WhatsAppCampaignLog", campaignLogSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  const campaignId = "6a85cabf611f56253565c6d3";
  const log = await WhatsAppCampaignLog.findOne({ campaignId });
  
  if (!log) {
    console.log("Campaign log not found in local DB.");
  } else {
    console.log("Campaign Log in Local DB:", JSON.stringify(log, null, 2));
  }

  // Let's also check Whats AI campaign status
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (ceo) {
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
    
    if (token) {
      const headers = {
        "Authorization": `Bearer ${token}`,
        "x-api-key": partnerKey,
        "x-client-id": ceo.whatsAppClientId,
        "Content-Type": "application/json"
      };

      try {
        const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}`, { headers });
        console.log("Campaign on Whats AI server:", JSON.stringify(cRes.data, null, 2));
      } catch (err) {
        console.error("Error fetching campaign from Whats AI:", err.response?.data || err.message);
      }

      // Check last message logs for the WABA client to see if there is any failed delivery status
      try {
        const msgRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/messages?limit=10`, { headers });
        const messages = msgRes.data?.data?.messages || msgRes.data?.messages || [];
        console.log(`\nLast 5 messages status on Whats AI server:`);
        messages.slice(0, 5).forEach(m => {
          console.log(`To: ${m.to}, Body: ${m.body || m.type}, Status: ${m.status}, ErrorReason: ${m.errorReason || "none"}`);
        });
      } catch (err) {
        console.error("Error fetching message logs from Whats AI:", err.response?.data || err.message);
      }
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
