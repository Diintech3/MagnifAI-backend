const axios = require("axios");

const apiBaseUrl = "http://127.0.0.1:5005";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function verify() {
  console.log("Logging in...");
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": lakshmiClientId,
    "Content-Type": "application/json"
  };

  console.log("\n--- Requesting Overview WITH x-client-id ---");
  const res = await axios.get(`${apiBaseUrl}/api/analytics/overview`, { headers });
  console.log("Overview Response:", JSON.stringify(res.data, null, 2));

  console.log("\n--- Requesting Overview WITHOUT x-client-id ---");
  const res2 = await axios.get(`${apiBaseUrl}/api/analytics/overview`, { headers: { ...headers, "x-client-id": undefined } });
  console.log("Overview Response (No Client):", JSON.stringify(res2.data, null, 2));
}

verify().catch(err => console.error("Error:", err.response ? err.response.data : err.message));
