const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function inspectWhatsAiAgents() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  // Swap database name to whatsapp-automation
  const parts = dbUri.split('/');
  const baseUri = parts.slice(0, -1).join('/');
  const whatsAiDbUri = `${baseUri}/whatsapp-automation`;

  try {
    console.log(`Connecting to WhatsAI Database: ${whatsAiDbUri}`);
    const conn = await mongoose.createConnection(whatsAiDbUri).asPromise();
    console.log("Connected successfully!");

    // 1. Inspect Lakshami Raj Singh user document
    const usersCol = conn.collection("users");
    const lakshamiUser = await usersCol.findOne({ _id: new mongoose.Types.ObjectId("6a66f2c106372d3b8ea6b902") });
    console.log("\nLakshami Raj Singh Client Doc in WhatsAI:");
    console.log(JSON.stringify(lakshamiUser, null, 2));

    // 2. Inspect aiagents collection
    const aiAgentsCol = conn.collection("aiagents");
    const count = await aiAgentsCol.countDocuments();
    console.log(`\nTotal AI Agents in WhatsAI: ${count}`);

    const agents = await aiAgentsCol.find({}).limit(5).toArray();
    console.log("\nSample AI Agents in WhatsAI:");
    console.log(JSON.stringify(agents, null, 2));

  } catch (err) {
    console.error("Failed to inspect WhatsAI agents:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

inspectWhatsAiAgents();
