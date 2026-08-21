const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function testAnalyticsDates() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO not found");
    process.exit(1);
  }

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
    "x-client-id": ceo.whatsAppClientId
  };

  const testParams = [
    {}, // Default (no params)
    { startDate: "2026-08-01", endDate: "2026-08-22" },
    { start: "2026-08-01", end: "2026-08-22" },
    { from: "2026-08-01", to: "2026-08-22" },
    { range: "all" }
  ];

  for (let i = 0; i < testParams.length; i++) {
    const params = testParams[i];
    console.log(`\n--- Test ${i + 1}: Query with parameters: ${JSON.stringify(params)} ---`);
    try {
      const response = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/analytics/overview`,
        { headers, params }
      );
      console.log(`Response status: ${response.status}`);
      console.log("Overview data:", JSON.stringify(response.data?.data || response.data, null, 2));
    } catch (err) {
      console.error("Failed:", err.response ? err.response.data : err.message);
    }
  }

  await mongoose.disconnect();
}

testAnalyticsDates();
