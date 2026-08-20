const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const email = "singhlakshmiraj@gmail.com";

  const headers = {
    "x-partner-key": partnerKey
  };

  try {
    const res = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/client-status?email=${encodeURIComponent(email)}`,
      { headers }
    );
    console.log("Whats AI Client Status:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error("Error fetching client status:", e.response?.data || e.message);
  }
}

run();
