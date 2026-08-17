const axios = require("axios");
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

  console.log("=== SENDING FESTIVAL_GREETINGS WITH LANGUAGE: 'hi' ===");
  try {
    const res = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`,
      {
        phone: "917970906978",
        templateName: "festival_greetings",
        language: "hi",
        variables: [
          { key: "1", value: "Anand" },
          { key: "2", value: "Diwali" }
        ]
      },
      { headers }
    );
    console.log("SUCCESS! Response:", res.data);
  } catch (e) {
    console.log("Error status:", e.response?.status);
    console.log("Error details:", JSON.stringify(e.response?.data || e.message));
  }
}

main().catch(console.error);
