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
    "x-client-id": "6a66f2c106372d3b8ea6b902",
    "Content-Type": "application/json"
  };

  const templateId = "6a68f26f86feedf812fa6a67"; // Festival Greetings
  const groupId = "6a82d07424d0dbb08e022ac7"; // Akkash

  try {
    // 1. Create campaign on Whats AI
    console.log("1. Creating campaign on Whats AI...");
    const createRes = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns`,
      {
        name: "Whats AI Direct Campaign Test",
        targetGroup: groupId,
        template: templateId,
        variablesMapping: { "1": "{{contact.name}}", "2": "दीपावली" }
      },
      { headers }
    );
    console.log("Create Campaign Response:", createRes.data);
    const campaignId = createRes.data?.data?.campaign?._id || createRes.data?.data?.campaign?.id || createRes.data?.campaignId;
    if (!campaignId) {
      console.error("No campaignId returned");
      return;
    }

    // 2. Trigger send on Whats AI
    console.log(`\n2. Triggering send for campaign ${campaignId}...`);
    const sendRes = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}/send`,
      {},
      { headers }
    );
    console.log("Send Campaign Response:", sendRes.data);
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
