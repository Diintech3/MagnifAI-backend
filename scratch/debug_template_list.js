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

  const tListRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/templates`, { headers });
  const tList = tListRes.data?.data?.templates || tListRes.data?.templates || [];

  console.log(`Found ${tList.length} templates:`);
  tList.forEach(t => {
    console.log(`- ID: ${t._id || t.id}, Name: ${t.name}, WhatsAppTemplateName: ${t.whatsappTemplateName}, Status: ${t.metaStatus || t.status}`);
  });
  
  // Also check campaign 6a85cabf611f56253565c6d3
  try {
    const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/6a85cabf611f56253565c6d3`, { headers });
    console.log("\nCampaign Template ID:", cRes.data?.data?.campaign?.template);
  } catch (err) {
    console.log("Could not load campaign:", err.message);
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
