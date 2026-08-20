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

  // Use the campaign ID we just created in the E2E test
  const campaignId = "6a86b69f436d42e9984dbd5b";

  console.log("Calling Whats AI POST /api/campaigns/:id/send...");
  try {
    const res = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}/send`,
      {},
      { headers }
    );
    console.log("Response:", res.data);
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
