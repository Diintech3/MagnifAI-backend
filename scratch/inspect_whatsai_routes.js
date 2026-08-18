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
    console.log("Handshake successful.");

    const headers = {
      "Authorization": `Bearer ${token}`,
      "x-api-key": partnerKey,
      "Content-Type": "application/json"
    };

    // 2. Fetch conversations
    console.log("\nFetching conversations from WhatsAI...");
    const convsRes = await axios.get(`${apiBaseUrl}/api/inbox/conversations`, { headers });
    console.log("Conversations response status:", convsRes.status);
    console.log("Conversations count:", convsRes.data?.data?.conversations?.length || convsRes.data?.conversations?.length || 0);
    
    const conversations = convsRes.data?.data?.conversations || convsRes.data?.conversations || convsRes.data?.data || [];
    if (conversations.length > 0) {
      const realId = conversations[0]._id || conversations[0].id;
      console.log(`\nFound real conversation ID: ${realId}`);
      console.log("Full conversation item:", JSON.stringify(conversations[0], null, 2));

      // Try marking this REAL conversation as read
      console.log(`\nTrying PUT /api/inbox/conversations/${realId}/mark-read ...`);
      try {
        const markRes = await axios.put(
          `${apiBaseUrl}/api/inbox/conversations/${realId}/mark-read`,
          {},
          { headers }
        );
        console.log("Result:", markRes.status, JSON.stringify(markRes.data));
      } catch (err) {
        console.log("Failed:", err.response?.status, JSON.stringify(err.response?.data || err.message));
      }
    } else {
      console.log("No active conversations found.");
    }

  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

runTest();
