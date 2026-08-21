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
    const convsRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers }
    );
    const conversations = convsRes.data?.data?.conversations || convsRes.data?.conversations || [];
    console.log(`Inspecting ${conversations.length} conversations for failure details...`);

    let checkedCount = 0;
    for (const conv of conversations) {
      const messagesRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${conv._id || conv.id}/messages`,
        { headers }
      );
      const messages = messagesRes.data?.data?.messages || messagesRes.data?.messages || [];
      const failed = messages.filter(m => m.status === "failed");
      if (failed.length > 0) {
        console.log(`\nPhone: ${conv.phone || conv.customerPhone} | Name: ${conv.contactName} | Failed Count: ${failed.length}`);
        failed.slice(-2).forEach(m => {
          console.log(`  - Msg ID: ${m._id || m.whatsappMessageId}`);
          console.log(`    Body/Template: ${m.body || m.text || m.templateName}`);
          console.log(`    ErrorReason:`, m.errorReason);
          console.log(`    ErrorDetails:`, m.errorDetails || m.error_details || m.error);
        });
        checkedCount++;
      }
      if (checkedCount >= 5) break;
    }
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
