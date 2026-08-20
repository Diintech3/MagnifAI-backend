const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function checkUserMobileLogs() {
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

  const userPhone = "919456051999";
  console.log(`=== Messages for User Personal Phone (${userPhone}) ===`);
  try {
    const convRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, { headers, timeout: 15000 });
    const convs = convRes.data?.data?.conversations || [];
    const userConv = convs.find(c => String(c.phone).replace(/[^0-9]/g, "").endsWith(userPhone.slice(-10)));
    
    if (userConv) {
      const mRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations/${userConv._id || userConv.id}/messages`, { headers });
      const msgs = mRes.data?.data?.messages || [];
      console.log(`Found ${msgs.length} messages:`);
      msgs.forEach(m => {
        console.log(`- Time: ${m.createdAt} | Status: ${m.status} | Direction: ${m.direction} | Body: ${m.body} | MsgId: ${m.whatsappMessageId} | ErrorReason: ${m.errorReason}`);
      });
    } else {
      console.log("No conversation found for phone", userPhone);
    }
  } catch (e) {
    console.log("Error:", e.response?.data || e.message);
  }
}

checkUserMobileLogs().catch(console.error);
