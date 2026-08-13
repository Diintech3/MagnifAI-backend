const mongoose = require("mongoose");
const axios = require("axios");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { listAgents, getVisitorSessions, getSessionHistory } = require("../src/services/agentAiService");

async function checkPings() {
  try {
    console.log("Connecting to MongoDB:", env.MONGODB_URI);
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    // Find the first active CEO
    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    if (!ceo) {
      console.log("CEO 'vijay.wiz@gmail.com' not found. Fetching any CEO...");
      const anyCeo = await CEO.findOne({});
      console.log("Found CEO:", anyCeo ? anyCeo.email : "None");
    } else {
      console.log("Found CEO:", ceo.email, "RAG Client ID:", ceo.ragClientId, "RAG Token:", ceo.ragToken);
    }

    const targetCeo = ceo || await CEO.findOne({});
    if (!targetCeo) {
      console.error("No CEO found in DB!");
      await mongoose.disconnect();
      return;
    }

    const token = targetCeo.ragToken || env.UGC_AI_APP_TOKEN;
    console.log("Using token:", token);

    console.log("Fetching agents from external AI server...");
    const agents = await listAgents(token);
    console.log(`Successfully fetched ${agents.length} agents:`);
    console.log(JSON.stringify(agents, null, 2));

    for (const agent of agents) {
      console.log(`\n--------------------------------------------`);
      console.log(`Checking Agent: ${agent.name} (ID: ${agent.agent_id}, Category: ${agent.category})`);
      
      try {
        const sessions = await getVisitorSessions(agent.agent_id, token);
        console.log(`Total sessions (visitors): ${sessions.length}`);
        
        let totalMessages = 0;
        for (const sess of sessions) {
          const history = await getSessionHistory(sess.session_id, token);
          const historyCount = Array.isArray(history) ? history.length : 0;
          totalMessages += historyCount;
          console.log(`  - Session ${sess.session_id}: ${historyCount} messages (Source: ${sess.device_name || 'web'})`);
        }
        console.log(`Total messages (pings) for this Agent: ${totalMessages}`);
      } catch (err) {
        console.error(`Error fetching data for agent ${agent.agent_id}:`, err.message);
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  } catch (err) {
    console.error("Error in checkPings:", err);
  }
}

checkPings();
