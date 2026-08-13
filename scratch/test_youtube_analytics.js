const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");
const { signAccessToken } = require("../src/utils/jwt");

async function runTest() {
  try {
    // 1. Connect to DB
    const dbUri = process.env.MONGODB_URI;
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB.");

    // 2. Retrieve Vijay CEO
    const ceo = await CEO.findOne({ email: /vijay/i });
    if (!ceo) {
      console.error("CEO Vijay Kumar not found in DB!");
      await mongoose.disconnect();
      return;
    }
    console.log(`Found CEO: ${ceo.name}`);

    // 3. Generate Auth token
    const tokenPayload = {
      sub: ceo._id.toString(),
      appId: ceo.appId.toString(),
      role: "CEO"
    };
    const token = signAccessToken(tokenPayload);

    // 4. Hit /api/app/social/youtube/analytics?timeRange=All
    console.log("\n--- Testing with timeRange=All ---");
    const resAll = await axios.get("http://localhost:4000/api/app/social/youtube/analytics?timeRange=All", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status:", resAll.status);
    console.log("Data:", JSON.stringify(resAll.data, null, 2));

    // 5. Hit /api/app/social/youtube/analytics?timeRange=7 Days
    console.log("\n--- Testing with timeRange=7 Days ---");
    const res7Days = await axios.get("http://localhost:4000/api/app/social/youtube/analytics?timeRange=7%20Days", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status:", res7Days.status);
    console.log("Data:", JSON.stringify(res7Days.data, null, 2));

    await mongoose.disconnect();
    console.log("\nDisconnected from DB. Test finished.");
  } catch (err) {
    console.error("Test failed:", err.response ? err.response.data : err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
}

runTest();
