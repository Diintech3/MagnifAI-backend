const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { signAccessToken } = require("../src/utils/jwt");
const axios = require("axios");

async function testLocalWhatsApp() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to DB successfully!");

    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    if (!ceo) {
      console.error("CEO Lakshami Raj Singh not found!");
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
      "http://localhost:4000/api/app/whatsapp/conversations",
      "http://localhost:4000/api/app/whatsapp/campaigns",
      "http://localhost:4000/api/app/whatsapp/templates/list"
    ];

    console.log("\nTesting CEO endpoints with axios...");
    for (const url of endpoints) {
      try {
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[SUCCESS] ${url} -> Status: ${res.status}`);
        console.log(`Data:`, JSON.stringify(res.data, null, 2));
      } catch (err) {
        console.error(`[FAIL] ${url} -> Status: ${err.response ? err.response.status : err.message}`);
        if (err.response) {
          console.error("  Response body:", err.response.data);
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error in testLocalWhatsApp:", err);
  }
}

testLocalWhatsApp();
