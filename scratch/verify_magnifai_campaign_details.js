const axios = require("axios");

const apiBaseUrl = "http://127.0.0.1:4000";
const email = "singhlakshmiraj@gmail.com";
const password = "password123";

async function verifyDetails() {
  console.log("Logging into MagnifAI backend...");
  
  // Login to get token
  let token = "";
  try {
    const loginRes = await axios.post(`${apiBaseUrl}/api/auth/ceo/login`, {
      email,
      password
    });
    token = loginRes.data?.accessToken || loginRes.data?.data?.token || loginRes.data?.token;
  } catch (err) {
    console.error("Login failed. Trying CEO direct endpoint if config allows...");
    // Attempt fallback or log
    throw err;
  }
  
  console.log("Token obtained successfully.");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // 1. Get Campaign list
  console.log("\nFetching WhatsApp Campaigns list from MagnifAI...");
  const listRes = await axios.get(`${apiBaseUrl}/api/app/whatsapp/campaigns`, { headers });
  const campaigns = listRes.data?.campaigns || listRes.data?.data?.campaigns || [];
  console.log(`Found ${campaigns.length} campaigns.`);

  if (campaigns.length > 0) {
    const campaignId = "6a75f03e9dafc6dfa973342d";

    console.log(`\n--- Selected Campaign: (ID: ${campaignId}) ---`);

    // 2. Fetch campaign details
    console.log(`\nFetching details for Campaign ID ${campaignId} from MagnifAI...`);
    const detailRes = await axios.get(`${apiBaseUrl}/api/app/whatsapp/campaigns/${campaignId}`, { headers });
    console.log("Details Response:", JSON.stringify(detailRes.data, null, 2));
  }
}

verifyDetails().catch(err => {
  console.error("Verification failed:", err.response ? err.response.data : err.message);
});
