const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO not found.");
    process.exit(1);
  }

  const token = ceo.whatsAppToken;
  const phoneId = ceo.whatsAppPhoneId;

  console.log("CEO WhatsApp Config:");
  console.log(`Phone ID: ${phoneId}`);
  console.log(`Token Preview: ${token ? token.slice(0, 15) + "..." + token.slice(-15) : "none"}`);

  // We will call Meta Graph API debug/info endpoints directly
  console.log("\nQuerying Meta Graph API with CEO's token...");
  
  // Test 1: Query the phone number object details
  try {
    const metaRes = await axios.get(`https://graph.facebook.com/v19.0/${phoneId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Meta Response (Phone ID Query):", metaRes.data);
  } catch (err) {
    console.error("Meta Query (Phone ID Query) Failed:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Error data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }

  // Test 2: Debug the token itself using Meta's debug_token endpoint (if we have app token, else verify via me)
  try {
    const metaRes = await axios.get(`https://graph.facebook.com/v19.0/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Meta Response (Me Query):", metaRes.data);
  } catch (err) {
    console.error("\nMeta Query (Me Query) Failed:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Error data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
