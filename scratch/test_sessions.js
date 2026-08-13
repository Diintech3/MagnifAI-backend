const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");
const { Contact } = require("../src/models/Contact");
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
    console.log(`Found CEO: ${ceo.name} (ID: ${ceo._id}, AppId: ${ceo.appId})`);

    // 3. Generate Auth token
    const tokenPayload = {
      sub: ceo._id.toString(),
      appId: ceo.appId.toString(),
      role: "CEO"
    };
    const token = signAccessToken(tokenPayload);
    console.log("Generated local CEO token.");

    // 4. Hit /api/agents/sessions with local token to trigger auto-sync
    console.log("Making authenticated GET request to /api/agents/sessions...");
    const response = await axios.get("http://localhost:4000/api/agents/sessions", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log(`GET /sessions Response status: ${response.status}`);
    console.log(`Sessions count: ${response.data.summary ? response.data.summary.totalPings : 0}`);

    // 5. Query the database to check if contacts were successfully created with ceoId and contactType: "new"
    console.log("\nQuerying Contact collection for verified output...");
    const contacts = await Contact.find({ appId: ceo.appId });
    console.log(`Total Contacts recreated for App: ${contacts.length}`);

    if (contacts.length === 0) {
      console.log("No contacts synced. (Make sure you have active sessions on 3rdAI server)");
    } else {
      contacts.forEach(c => {
        console.log(`ID: ${c._id} | Name: ${c.name} | Phone: ${c.phone} | ceoId: ${c.ceoId} | Type: ${c.contactType} | Source: ${c.lastConnected}`);
      });
    }

    await mongoose.disconnect();
    console.log("Disconnected from DB. Test finished.");
  } catch (err) {
    console.error("Test failed:", err.response ? err.response.data : err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
}

runTest();
