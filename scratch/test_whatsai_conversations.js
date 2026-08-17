const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  console.log("=== ENV CHECK ===");
  console.log("API_BASE_URL:", apiBaseUrl || "NOT SET");
  console.log("PARTNER_KEY:", partnerKey ? partnerKey.substring(0, 20) + "..." : "NOT SET");
  console.log("ACCESS_TOKEN:", clientToken ? clientToken.substring(0, 20) + "..." : "NOT SET");
  console.log("REFERENCE_KEY:", ref || "NOT SET");

  // Step 1: Get JWT Token
  console.log("\n=== Step 1: Getting JWT Token ===");
  let jwtToken;
  try {
    const loginRes = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
      { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
      { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } }
    );
    jwtToken = loginRes.data?.token || loginRes.data?.data?.token || loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    console.log("JWT Token:", jwtToken ? jwtToken.substring(0, 30) + "..." : "FAILED TO GET");
  } catch (e) {
    console.error("Login failed:", e.response?.data || e.message);
    await mongoose.disconnect();
    return;
  }

  // Step 2: Get Conversations WITH Lakshami's client ID
  const clientId = "6a66f2c106372d3b8ea6b902"; // Lakshami Raj Singh
  const headers = {
    "Authorization": `Bearer ${jwtToken}`,
    "x-api-key": partnerKey,
    "x-client-id": clientId,
    "Content-Type": "application/json"
  };

  console.log("\n=== Step 2: Fetching Conversations (with x-client-id) ===");
  try {
    const convRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers }
    );
    const data = convRes.data;
    console.log("Response status:", convRes.status);
    console.log("Response keys:", Object.keys(data));
    const conversations = data.conversations || data.data || data;
    if (Array.isArray(conversations)) {
      console.log("Total conversations:", conversations.length);
      conversations.slice(0, 5).forEach((c, i) => {
        console.log(`  [${i}] id=${c.id || c._id}, name=${c.name}, phone=${c.phone}, lastMsg=${c.lastMessage?.substring(0, 40)}`);
      });
    } else {
      console.log("Raw response:", JSON.stringify(data).substring(0, 500));
    }
  } catch (e) {
    console.error("Conversations fetch failed:", e.response?.data || e.message);
  }

  // Step 3: Get Conversations WITHOUT client ID (to compare)
  console.log("\n=== Step 3: Fetching Conversations (WITHOUT x-client-id) ===");
  try {
    const headers2 = { ...headers };
    delete headers2["x-client-id"];
    const convRes2 = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers: headers2 }
    );
    const data2 = convRes2.data;
    const conversations2 = data2.conversations || data2.data || data2;
    if (Array.isArray(conversations2)) {
      console.log("Total conversations (no clientId):", conversations2.length);
    } else {
      console.log("Raw response:", JSON.stringify(data2).substring(0, 500));
    }
  } catch (e) {
    console.error("Conversations (no client) failed:", e.response?.data || e.message);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
