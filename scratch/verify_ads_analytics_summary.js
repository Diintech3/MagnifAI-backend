const axios = require("axios");

const apiBaseUrl = "http://127.0.0.1:4000";
const email = "singhlakshmiraj@gmail.com";
const password = "password123";

async function verify() {
  console.log("Logging into MagnifAI backend...");
  const loginRes = await axios.post(`${apiBaseUrl}/api/auth/ceo/login`, {
    email,
    password
  });
  const token = loginRes.data?.accessToken;
  console.log("Token obtained successfully.");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  console.log("\nFetching Ads Analytics Summary from MagnifAI...");
  const res = await axios.get(`${apiBaseUrl}/api/app/ads/analytics-summary`, { headers });
  console.log("Response:", JSON.stringify(res.data, null, 2));
}

verify().catch(err => {
  console.error("Verification failed:", err.response ? err.response.data : err.message);
});
