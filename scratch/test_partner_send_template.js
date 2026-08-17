const axios = require("axios");
require("dotenv").config();

async function main() {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

  console.log("=== TESTING POST /api/partner/send-template ===");
  try {
    const res = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/send-template`,
      {
        clientEmail: "singhlakshmiraj@gmail.com",
        phone: "919999900000",
        templateName: "holiday_offer",
        language: "en",
        variables: []
      },
      {
        headers: {
          "x-partner-key": partnerKey,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Status:", res.status);
    console.log("Response:", res.data);
  } catch (e) {
    console.log("Error status:", e.response?.status);
    console.log("Error response:", e.response?.data || e.message);
  }
}

main().catch(console.error);
