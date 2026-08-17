const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function checkCeoAgent() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log("Connected to Magnifi AI database!");

    const { CEO } = require("../src/models/CEO");
    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    if (ceo) {
      console.log("\nCEO Lakshami Raj Singh fields:");
      console.log(`- name: ${ceo.name}`);
      console.log(`- agentId (local): ${ceo.agentId}`);
      console.log(`- ragClientId: ${ceo.ragClientId}`);
    } else {
      console.log("CEO not found.");
    }

  } catch (err) {
    console.error("Failed to inspect CEO agent:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

checkCeoAgent();
