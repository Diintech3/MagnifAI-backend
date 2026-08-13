const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { App } = require("../src/models/App");
const { CEO } = require("../src/models/CEO");
const { listAgents } = require("../src/services/agentAiService");

async function verifyAdminApps() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    const apps = await App.find({});
    console.log(`Found ${apps.length} apps in database:\n`);

    for (const app of apps) {
      const ceo = await CEO.findOne({ appId: app._id });
      let agentCount = "N/A";
      let status = "No CEO profile";
      
      if (ceo) {
        status = ceo.ragToken ? "Has RAG Token" : "No RAG Token";
        if (ceo.ragToken) {
          try {
            const agents = await listAgents(ceo.ragToken);
            agentCount = Array.isArray(agents) ? agents.length : 0;
          } catch (err) {
            agentCount = `Error: ${err.message}`;
          }
        }
      }

      console.log(`- Business: ${app.businessName}`);
      console.log(`  Static agentsCount in App Doc: ${app.agentsCount}`);
      console.log(`  CEO Email: ${ceo ? ceo.email : "None"}`);
      console.log(`  RAG Token Status: ${status}`);
      console.log(`  Real Agent Count from 3rdAI: ${agentCount}`);
      console.log(`-----------------------------------------------`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verifyAdminApps();
