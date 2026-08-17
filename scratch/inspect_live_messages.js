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
  const jwtToken = loginRes.data?.data?.accessToken || loginRes.data?.data?.token || loginRes.data?.token;

  const clientId = "6a66f2c106372d3b8ea6b902";
  const headers = {
    "Authorization": `Bearer ${jwtToken}`,
    "x-api-key": partnerKey,
    "x-client-id": clientId,
    "Content-Type": "application/json"
  };

  const convsRes = await axios.get(
    `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
    { headers }
  );
  const convs = convsRes.data?.data?.conversations || convsRes.data?.conversations || [];
  console.log("Found conversations count:", convs.length);
  for (const c of convs.slice(0, 2)) {
    console.log("\n==================================");
    console.log("CONVERSATION:", c.customerName, c.customerPhone, c._id);
    const msgRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${c._id}/messages`,
      { headers }
    );
    console.log("MESSAGES COUNT:", msgRes.data?.data?.messages?.length || msgRes.data?.messages?.length || msgRes.data?.length);
    const msgs = msgRes.data?.data?.messages || msgRes.data?.messages || msgRes.data || [];
    console.log("FIRST 3 MESSAGES:", JSON.stringify(msgs.slice(0, 3), null, 2));
  }
}

main().catch(console.error);
