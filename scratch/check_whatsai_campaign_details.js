const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function checkDetails() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find a CEO to get their whatsAppClientId
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO singhlakshmiraj@gmail.com not found!");
    process.exit(1);
  }
  
  console.log("Using CEO:", ceo.email, "WABA Client ID:", ceo.whatsAppClientId);

  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  console.log("Whats AI Base URL:", apiBaseUrl);

  const loginRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey } }
  );
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId
  };

  try {
    // 1. Get Campaign List
    console.log("\n=== 1. WHATS AI CAMPAIGNS LIST ===");
    const listRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns`, { headers });
    const campaigns = listRes.data?.data?.campaigns || listRes.data?.campaigns || [];
    console.log(`Found ${campaigns.length} campaigns.`);
    
    const nonDraftCampaigns = campaigns.filter(c => c.status !== "draft" || c.sent > 0 || c.totalContacts > 0);
    console.log(`Found ${nonDraftCampaigns.length} non-draft/completed campaigns.`);
    
    if (nonDraftCampaigns.length > 0) {
      for (let i = 0; i < Math.min(nonDraftCampaigns.length, 3); i++) {
        const c = nonDraftCampaigns[i];
        const campaignId = c._id || c.id;
        console.log(`\n--- Inspecting Non-Draft Campaign ${i + 1} (${c.name}): ---`);
        console.log(JSON.stringify(c, null, 2));
        
        // Get Campaign Details
        console.log(`Fetching detail for ${campaignId}...`);
        const detailRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}`, { headers });
        console.log("Detail response:", JSON.stringify(detailRes.data, null, 2));
      }
    } else if (campaigns.length > 0) {
      console.log("No non-draft campaigns found. Inspecting first campaign from the list:");
      console.log(JSON.stringify(campaigns[0], null, 2));
      const campaignId = campaigns[0]._id || campaigns[0].id;
      const detailRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}`, { headers });
      console.log("Detail response:", JSON.stringify(detailRes.data, null, 2));
    }

    // 3. Get Overview Stats
    console.log("\n=== 3. WHATS AI OVERVIEW STATS ===");
    const overviewRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/analytics/overview`, { headers });
    console.log("Overview response:", JSON.stringify(overviewRes.data, null, 2));

  } catch (err) {
    console.error("API Request failed:", err.response ? err.response.data : err.message);
  }

  await mongoose.disconnect();
}

checkDetails();
