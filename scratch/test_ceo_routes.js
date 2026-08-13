const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { signAccessToken } = require("../src/utils/jwt");
const axios = require("axios");

async function testCeoRoutes() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to DB successfully!");

    const ceo = await CEO.findOne({ email: "dhanveerchauhan@gmail.com" });
    if (!ceo) {
      console.error("CEO Dhanveer Chauhan not found!");
      await mongoose.disconnect();
      return;
    }

    const token = signAccessToken({
      sub: ceo._id.toString(),
      appId: ceo.appId.toString(),
      email: ceo.email,
      role: "CEO",
      name: ceo.name,
    });
    console.log("Generated CEO Access Token:", token);

    const endpoints = [
      "http://localhost:4000/api/app/content/stats/overview",
      "http://localhost:4000/api/app/workspace/ceos",
      "http://localhost:4000/api/app/social/instagram",
      "http://localhost:4000/api/app/social/instagram/analytics?timeRange=7%20Days",
      "http://localhost:4000/api/app/social/instagram/posts?timeRange=7%20Days"
    ];

    console.log("\nTesting CEO endpoints with axios...");
    for (const url of endpoints) {
      try {
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[SUCCESS] ${url} -> Status: ${res.status}`);
      } catch (err) {
        console.error(`[FAIL] ${url} -> Status: ${err.response ? err.response.status : err.message}`);
        if (err.response) {
          console.error("  Response body:", err.response.data);
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error in testCeoRoutes:", err);
  }
}

testCeoRoutes();
