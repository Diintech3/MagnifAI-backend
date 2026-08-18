const axios = require("axios");

async function runTest() {
  const apiBaseUrl = "https://w-a-backend.onrender.com";
  const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
  const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
  const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
  const apiKey = "whatsai-core-master-secret-key-2026";

  try {
    // 1. Handshake
    console.log("Starting authentication handshake...");
    const loginRes = await axios.post(
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
        }
      }
    );
    const token = loginRes.data.token || loginRes.data.data?.token || loginRes.data.accessToken || loginRes.data.data?.accessToken;
    console.log("Handshake successful, token retrieved.");

    const headers = {
      "Authorization": `Bearer ${token}`,
      "x-api-key": partnerKey,
      "Content-Type": "application/json"
    };

    const conversationId = "6a7f9f91f30d6f789647e9de";

    // 2. Try PUT /api/inbox/conversations/:id/mark-read
    console.log("\nTrying PUT /api/inbox/conversations/:id/mark-read...");
    try {
      const res = await axios.put(
        `${apiBaseUrl}/api/inbox/conversations/${conversationId}/mark-read`,
        {},
        { headers }
      );
      console.log("Result (PUT mark-read):", res.status, JSON.stringify(res.data));
    } catch (err) {
      console.log("Failed (PUT mark-read):", err.response?.status, JSON.stringify(err.response?.data || err.message));
    }

    // 3. Try POST /api/inbox/conversations/:id/mark-read
    console.log("\nTrying POST /api/inbox/conversations/:id/mark-read...");
    try {
      const res = await axios.post(
        `${apiBaseUrl}/api/inbox/conversations/${conversationId}/mark-read`,
        {},
        { headers }
      );
      console.log("Result (POST mark-read):", res.status, JSON.stringify(res.data));
    } catch (err) {
      console.log("Failed (POST mark-read):", err.response?.status, JSON.stringify(err.response?.data || err.message));
    }

    // 4. Try PATCH /api/inbox/conversations/:id/mark-read
    console.log("\nTrying PATCH /api/inbox/conversations/:id/mark-read...");
    try {
      const res = await axios.patch(
        `${apiBaseUrl}/api/inbox/conversations/${conversationId}/mark-read`,
        {},
        { headers }
      );
      console.log("Result (PATCH mark-read):", res.status, JSON.stringify(res.data));
    } catch (err) {
      console.log("Failed (PATCH mark-read):", err.response?.status, JSON.stringify(err.response?.data || err.message));
    }

    // 5. Try PUT /api/inbox/conversations/:id/read
    console.log("\nTrying PUT /api/inbox/conversations/:id/read...");
    try {
      const res = await axios.put(
        `${apiBaseUrl}/api/inbox/conversations/${conversationId}/read`,
        {},
        { headers }
      );
      console.log("Result (PUT read):", res.status, JSON.stringify(res.data));
    } catch (err) {
      console.log("Failed (PUT read):", err.response?.status, JSON.stringify(err.response?.data || err.message));
    }

  } catch (error) {
    console.error("Test process failed:", error.response?.data || error.message);
  }
}

runTest();
