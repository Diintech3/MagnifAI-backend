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

  const campaignId = "6a8721966cbb7af98165b0bf";

  try {
    console.log(`Fetching campaign details for ${campaignId}...`);
    const cDetail = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}`, { headers });
    console.log("Campaign details:", JSON.stringify(cDetail.data, null, 2));

    console.log("\nFetching conversations to check messages...");
    const convsRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`, { headers });
    const conversations = convsRes.data?.data?.conversations || convsRes.data?.conversations || [];

    for (const conv of conversations) {
      const messagesRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${conv._id || conv.id}/messages`,
        { headers }
      );
      const messages = messagesRes.data?.data?.messages || messagesRes.data?.messages || [];
      // Find messages sent in the last 15 minutes that belong to this template or are outbound
      const recent = messages.filter(m => {
        const diff = Date.now() - new Date(m.createdAt).getTime();
        return diff < 15 * 60 * 1000 && m.direction === "outbound";
      });

      if (recent.length > 0) {
        console.log(`\nPhone: ${conv.phone || conv.customerPhone}`);
        recent.forEach(m => {
          console.log(`  - [${m.status}] Message ID: ${m.whatsappMessageId || m._id} | Error: ${m.errorReason || 'None'} | Details: ${JSON.stringify(m.errorDetails || m.error_details || m.error || 'None')}`);
        });
      }
    }

  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
