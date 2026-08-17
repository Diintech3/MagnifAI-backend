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

  const convId = "6a7d877a82a1b4879b695778";
  
  // Try with apiKey
  try {
    const msgRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${convId}/messages`,
      {
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Success with apiKey! Messages data structure:");
    console.log(JSON.stringify(msgRes.data, null, 2));
    return;
  } catch (e) {
    console.log("Failed with apiKey:", e.response?.data || e.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
