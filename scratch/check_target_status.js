const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function checkMsg() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const res = await axios.get(`${apiBaseUrl}/api/inbox/conversations/6a6728e40686214cf0fc6a43/messages`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey, "x-client-id": lakshmiClientId },
    timeout: 10000
  });

  const msgs = res.data?.data?.messages || [];
  const target = msgs.find(m => m.whatsappMessageId === "wamid.HBgMOTE3OTcwOTA2OTc4FQIAERgSNTc2RjMwNUFEMzU4RkY0ODBCAA==");
  console.log("Target message:", JSON.stringify(target, null, 2));
}

checkMsg().catch(console.error);
