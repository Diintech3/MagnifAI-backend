const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  let token = "";
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const { CEO } = require("../src/models/CEO");
    const ceo = await CEO.findOne({ email: "info@asharealty.co.in" });
    if (!ceo) {
      console.error("Asha Realty CEO not found!");
      await mongoose.disconnect();
      return;
    }
    const { signAccessToken } = require("../src/utils/jwt");
    token = signAccessToken({ sub: ceo._id, role: "CEO" });
    console.log("Found CEO and signed token successfully.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to generate token:", err.message);
    return;
  }

  try {
    console.log("Calling POST /api/app/whatsapp/sync-ceo...");
    const res = await axios.post("http://localhost:4000/api/app/whatsapp/sync-ceo", {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Sync Response:", JSON.stringify(res.data, null, 2));

    console.log("\nRe-checking status in local MagnifAI DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    const { CEO } = require("../src/models/CEO");
    const updatedCeo = await CEO.findOne({ email: "info@asharealty.co.in" });
    console.log({
      isWhatsAppConnected: updatedCeo.isWhatsAppConnected,
      whatsAppClientId: updatedCeo.whatsAppClientId
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error("API Call Error:", err.response?.data || err.message);
  }
}

run();
