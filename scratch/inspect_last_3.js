const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function main() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": lakshmiClientId
  };

  const convRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, { headers });
  const convs = convRes.data?.data?.conversations || [];
  const matched = convs.find(c => (c.customerPhone || "").endsWith("8726525782"));
  if (matched) {
    const mRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations/${matched._id || matched.id}/messages`, { headers });
    const msgs = mRes.data?.data?.messages || [];
    console.log("Total messages:", msgs.length);
    msgs.slice(-3).forEach(m => {
      console.log(`- Time: ${m.createdAt} | Status: ${m.status} | Body: ${m.body}`);
    });
  }
}

main().catch(console.error);
