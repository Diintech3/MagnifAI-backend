const axios = require("axios");

// Test against PRODUCTION server - same URL mobile app uses
const prodBaseUrl = "https://magnifaiapi.diintech.com";

// We need a CEO JWT token to test as CEO - let's test the health first
async function main() {
  console.log("=== Test 1: Is production backend reachable? ===");
  try {
    const r = await axios.get(`${prodBaseUrl}/`, { timeout: 15000 });
    console.log("Status:", r.status);
    console.log("Response:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status || "NO RESPONSE");
    console.log("Error:", e.response?.data || e.message);
  }

  // Test what WHATS_AI env vars are set on production
  console.log("\n=== Test 2: Check if WhatsApp analytics works WITHOUT auth (to see error source) ===");
  try {
    const r = await axios.get(`${prodBaseUrl}/api/app/whatsapp/analytics/overview`, { timeout: 15000 });
    console.log("Status:", r.status);
    console.log("Response:", JSON.stringify(r.data));
  } catch (e) {
    console.log("Status:", e.response?.status || "NO RESPONSE");
    console.log("Error:", JSON.stringify(e.response?.data) || e.message);
    console.log("Note: If 401/403 from MagnifAI own auth = CEO JWT expired. If 500 with Whats AI message = Whats AI rejected.");
  }
}

main().catch(console.error);
