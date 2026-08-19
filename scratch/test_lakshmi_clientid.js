const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";

// Lakshmi Raj's whatsAppClientId from DB
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function main() {
  console.log("=== Step 1: Login to get JWT token ===");
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;
  console.log("Token obtained:", token ? "YES" : "NO");

  const headersWithClientId = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": lakshmiClientId,
    "Content-Type": "application/json"
  };
  
  const headersWithoutClientId = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  // Test Analytics Overview WITH x-client-id (as mobile app does)
  console.log("\n=== Analytics WITH x-client-id (Lakshmi Raj) ===");
  try {
    const r = await axios.get(`${apiBaseUrl}/api/analytics/overview`, { headers: headersWithClientId, timeout: 30000 });
    console.log("Status:", r.status, "| Result:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status, "| Error:", JSON.stringify(e.response?.data));
  }

  // Test Analytics Overview WITHOUT x-client-id (as web does)
  console.log("\n=== Analytics WITHOUT x-client-id (as web/admin does) ===");
  try {
    const r = await axios.get(`${apiBaseUrl}/api/analytics/overview`, { headers: headersWithoutClientId, timeout: 30000 });
    console.log("Status:", r.status, "| Result:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status, "| Error:", JSON.stringify(e.response?.data));
  }

  // Test Campaigns WITH x-client-id
  console.log("\n=== Campaigns WITH x-client-id (Lakshmi Raj) ===");
  try {
    const r = await axios.get(`${apiBaseUrl}/api/campaigns`, { headers: headersWithClientId, timeout: 30000 });
    console.log("Status:", r.status, "| Result:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status, "| Error:", JSON.stringify(e.response?.data));
  }

  // Test Conversations WITH x-client-id
  console.log("\n=== Conversations WITH x-client-id (Lakshmi Raj) ===");
  try {
    const r = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, { headers: headersWithClientId, timeout: 30000 });
    console.log("Status:", r.status, "| Result:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status, "| Error:", JSON.stringify(e.response?.data));
  }
}

main().catch(console.error);
