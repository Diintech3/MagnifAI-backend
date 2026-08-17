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

  const clientId = "6a66f2c106372d3b8ea6b902";
  const headers = {
    "Authorization": `Bearer ${jwtToken}`,
    "x-api-key": partnerKey,
    "x-client-id": clientId,
    "Content-Type": "application/json"
  };

  const routes = [
    "/api/inbox/send-template",
    "/api/inbox/template",
    "/api/messages/send-template",
    "/api/templates/send",
    "/api/partner/send-template",
    "/api/campaigns/send-direct",
    "/api/whatsapp/send-template"
  ];

  for (const r of routes) {
    try {
      const res = await axios.post(
        `${apiBaseUrl.replace(/\/$/, "")}${r}`,
        { phone: "919999900000", templateName: "holiday_offer" },
        { headers }
      );
      console.log(`FOUND ROUTE ${r}: Status ${res.status}`);
    } catch (e) {
      console.log(`${r} -> ${e.response?.status} (${e.response?.data?.message || e.message})`);
    }
  }
}

main().catch(console.error);
