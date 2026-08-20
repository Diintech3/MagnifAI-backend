const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const loginRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey } }
  );
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": "6a66f2c106372d3b8ea6b902",
    "Content-Type": "application/json"
  };

  const templateName = "ai_assistant";
  const language = "en";
  const variables = [{ key: "1", value: "Lakshmi Raj Singh" }];

  // Test 1: WITH + sign
  console.log("Sending WITH + sign (+917970906978)...");
  try {
    const res = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`,
      { phone: "+917970906978", templateName, language, variables },
      { headers }
    );
    console.log("WITH + Response:", res.data);
  } catch (e) {
    console.error("WITH + Error:", e.response?.data || e.message);
  }

  // Test 2: WITHOUT + sign
  console.log("\nSending WITHOUT + sign (917970906978)...");
  try {
    const res = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`,
      { phone: "917970906978", templateName, language, variables },
      { headers }
    );
    console.log("WITHOUT + Response:", res.data);
  } catch (e) {
    console.error("WITHOUT + Error:", e.response?.data || e.message);
  }
}

run();
