const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  const phoneId = "790783224112773";
  const correctWabaToken = process.env.WHATSAPP_TOKEN; // Starts with EAAPQNJxvtoUBPN...
  
  console.log(`Testing Meta API for Phone ID: ${phoneId}`);
  console.log(`Using correct WHATSAPP_TOKEN (Preview: ${correctWabaToken.slice(0, 15)}...)`);

  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${phoneId}`, {
      headers: {
        Authorization: `Bearer ${correctWabaToken}`
      }
    });
    console.log("\nSuccess! Meta response with correct token:", res.data);
  } catch (err) {
    console.error("\nFailed with correct token:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Error data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

run();
