const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkSubUsers() {
  const baseUrl = process.env.UGC_AI_BASE_URL || "https://vectorize.diintech.com";
  const token = process.env.UGC_AI_APP_TOKEN;

  console.log("Base URL:", baseUrl);
  try {
    const res = await axios.get(`${baseUrl}/api/clients/sub-users`, {
      headers: { "X-App-Token": token }
    });
    console.log("Sub-users response:", JSON.stringify(res.data, null, 2));
    if (res.data && Array.isArray(res.data.users)) {
      console.log(`\nTotal Sub-users: ${res.data.users.length}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
  }
}

checkSubUsers();
