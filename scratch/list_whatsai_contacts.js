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
    "x-client-id": "6a66f2c106372d3b8ea6b902"
  };

  try {
    const res = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
      { headers }
    );
    const allContacts = res.data?.data?.contacts || res.data?.contacts || [];
    console.log(`Total contacts on Whats AI: ${allContacts.length}`);
    allContacts.forEach((c, idx) => {
      console.log(`${idx + 1}. Name: ${c.name} | Phone: ${c.phone} | Groups:`, c.group);
    });
  } catch (e) {
    console.error("Error fetching contacts from Whats AI:", e.response?.data || e.message);
  }
}

run();
