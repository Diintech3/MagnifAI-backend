const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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

  const testNumbers = [
    { name: "Anand (E.164)", phone: "917970906978" },
    { name: "Raj (E.164)", phone: "918726525782" },
    { name: "Hirdesh (E.164)", phone: "919953100111" }
  ];

  for (const item of testNumbers) {
    console.log(`\n--- Sending template to ${item.name} (${item.phone}) ---`);
    try {
      const res = await axios.post(
        `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`,
        {
          phone: item.phone,
          templateName: "ai_assistant",
          language: "en",
          variables: [{ key: "1", value: "Lakshmi Raj Singh" }]
        },
        { headers }
      );
      console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error("Error Response Status:", e.response?.status);
      console.error("Error Response Data:", JSON.stringify(e.response?.data, null, 2));
    }
  }
}

run();
