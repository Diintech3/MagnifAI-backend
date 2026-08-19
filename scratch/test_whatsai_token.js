const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";

async function main() {
  console.log("=== Step 1: Test Login to get JWT token ===");
  try {
    const res = await axios.post(
      `${apiBaseUrl}/api/auth/api-sharing-login`,
      {
        apiSharingKey: partnerKey,
        accessToken: clientToken,
        referenceKey: ref
      },
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );
    console.log("Login Response Status:", res.status);
    console.log("Login Response Data:", JSON.stringify(res.data, null, 2));
    
    // Extract token
    let token = null;
    if (res.data && res.data.token) token = res.data.token;
    else if (res.data && res.data.data && res.data.data.token) token = res.data.data.token;
    else if (res.data && res.data.data && res.data.data.accessToken) token = res.data.data.accessToken;
    else if (res.data && res.data.accessToken) token = res.data.accessToken;
    
    if (!token) {
      console.log("ERROR: Could not extract JWT token from response!");
      return;
    }
    console.log("\n=== JWT Token obtained:", token.substring(0, 50) + "... ===\n");

    // Step 2: Test analytics overview
    console.log("=== Step 2: Test Analytics Overview ===");
    try {
      const r2 = await axios.get(`${apiBaseUrl}/api/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": partnerKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      });
      console.log("Analytics Status:", r2.status);
      console.log("Analytics Data:", JSON.stringify(r2.data, null, 2));
    } catch (e) {
      console.log("Analytics Error Status:", e.response?.status);
      console.log("Analytics Error:", JSON.stringify(e.response?.data, null, 2) || e.message);
    }

    // Step 3: Test campaigns
    console.log("\n=== Step 3: Test Campaigns ===");
    try {
      const r3 = await axios.get(`${apiBaseUrl}/api/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": partnerKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      });
      console.log("Campaigns Status:", r3.status);
      console.log("Campaigns Data:", JSON.stringify(r3.data, null, 2));
    } catch (e) {
      console.log("Campaigns Error Status:", e.response?.status);
      console.log("Campaigns Error:", JSON.stringify(e.response?.data, null, 2) || e.message);
    }

    // Step 4: Test conversations
    console.log("\n=== Step 4: Test Conversations/Inbox ===");
    try {
      const r4 = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": partnerKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      });
      console.log("Conversations Status:", r4.status);
      console.log("Conversations Data:", JSON.stringify(r4.data, null, 2));
    } catch (e) {
      console.log("Conversations Error Status:", e.response?.status);
      console.log("Conversations Error:", JSON.stringify(e.response?.data, null, 2) || e.message);
    }

  } catch (e) {
    console.log("LOGIN FAILED!");
    console.log("Status:", e.response?.status);
    console.log("Error:", JSON.stringify(e.response?.data, null, 2) || e.message);
  }
}

main();
