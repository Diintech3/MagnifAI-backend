const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function testFestivalGreetingsRaj() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  console.log("=== Testing Festival Greetings with language 'hi' on 918726525782 ===");
  const res = await axios.post(`${apiBaseUrl}/api/inbox/send-template`, {
    phone: "918726525782",
    templateName: "festival_greetings",
    language: "hi",
    variables: [
      { key: "1", value: "Raj" },
      { key: "2", value: "दीपावली" }
    ]
  }, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey, "x-client-id": lakshmiClientId }
  });

  const msgId = res.data?.data?.messageId;
  console.log("Sent with wamid:", msgId);

  // Wait 4 seconds for Meta webhook
  await new Promise(r => setTimeout(r, 4000));

  const convRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations/6a844da75bccf706d7b7d84b/messages`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey, "x-client-id": lakshmiClientId }
  });

  const msgs = convRes.data?.data?.messages || [];
  const target = msgs.find(m => m.whatsappMessageId === msgId);
  console.log("Webhook Final Status for festival_greetings on 918726525782:", target?.status, "errorReason:", target?.errorReason);
}

testFestivalGreetingsRaj().catch(console.error);
