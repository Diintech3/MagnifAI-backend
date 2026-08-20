const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function checkRecentFestivalMsgs() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const convRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey, "x-client-id": lakshmiClientId },
    timeout: 15000
  });

  const convs = convRes.data?.data?.conversations || [];
  console.log("=== Recent Outbound Messages for Festival Greetings ===");
  for (const c of convs.slice(0, 4)) {
    const mRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations/${c._id || c.id}/messages`, {
      headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey, "x-client-id": lakshmiClientId },
      timeout: 10000
    });
    const msgs = mRes.data?.data?.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.direction === "outbound") {
      console.log(`To: ${lastMsg.to} | Status: ${lastMsg.status} | Body: ${lastMsg.body} | MsgId: ${lastMsg.whatsappMessageId} | Error: ${lastMsg.errorReason || 'None'} | Time: ${lastMsg.createdAt}`);
    }
  }
}

checkRecentFestivalMsgs().catch(console.error);
