const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function main() {
  console.log("=== 1. Fresh Login to Whats AI ===");
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;
  console.log("Got fresh token:", token.slice(0, 30) + "...");

  console.log("\n=== 2. Test GET /api/campaigns WITH x-client-id ===");
  try {
    const res1 = await axios.get(`${apiBaseUrl}/api/campaigns`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": partnerKey,
        "x-client-id": lakshmiClientId
      },
      timeout: 10000
    });
    console.log("WITH x-client-id status:", res1.status, "Campaigns:", res1.data?.data?.campaigns?.length ?? res1.data?.campaigns?.length);
  } catch (e) {
    console.log("WITH x-client-id ERROR:", e.response?.status, e.response?.data || e.message);
  }

  console.log("\n=== 3. Test GET /api/campaigns WITHOUT x-client-id ===");
  try {
    const res2 = await axios.get(`${apiBaseUrl}/api/campaigns`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": partnerKey
      },
      timeout: 10000
    });
    console.log("WITHOUT x-client-id status:", res2.status, "Campaigns:", res2.data?.data?.campaigns?.length ?? res2.data?.campaigns?.length);
  } catch (e) {
    console.log("WITHOUT x-client-id ERROR:", e.response?.status, e.response?.data || e.message);
  }
}

main().catch(console.error);
