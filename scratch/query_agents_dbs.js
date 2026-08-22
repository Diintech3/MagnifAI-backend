const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function queryAgentsDB() {
  try {
    const dbUri = process.env.MONGODB_URI;
    console.log("Connecting to MongoDB:", dbUri.split("@")[1] || dbUri);
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB.");

    // Retrieve all CEOs
    const ceos = await CEO.find({});
    console.log(`\nFound ${ceos.length} CEOs in MongoDB:`);
    
    for (const ceo of ceos) {
      console.log("=========================================");
      console.log(`CEO Name:      ${ceo.name}`);
      console.log(`CEO Email:     ${ceo.email}`);
      console.log(`CEO agentId:   ${ceo.agentId}`);
      console.log(`CEO RAG Token: ${ceo.ragToken ? ceo.ragToken.substring(0, 15) + "..." : "None"}`);

      if (ceo.ragToken) {
        try {
          const baseUrl = process.env.UGC_AI_BASE_URL.replace(/\/$/, "");
          console.log(`Fetching agents from Vectorize (${baseUrl}) using this CEO's RAG Token...`);
          const res = await axios.get(`${baseUrl}/api/agents`, {
            headers: { "X-App-Token": ceo.ragToken }
          });
          const agents = res.data || [];
          console.log(`Vectorize returned ${agents.length} agents:`);
          agents.forEach((ag, idx) => {
            console.log(`  [Agent ${idx+1}] Name: ${ag.name}`);
            console.log(`            ID:   ${ag.agent_id || ag.id}`);
            console.log(`            Phone Number: ${ag.phone_number || "None"}`);
            console.log(`            Category: ${ag.category || "None"}`);
            if (ag.customization) {
              console.log(`            Customization:`, JSON.stringify(ag.customization));
            }
          });
        } catch (e) {
          console.error(`  Error fetching agents for ${ceo.name}:`, e.response ? e.response.data : e.message);
        }
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from DB.");
  } catch (err) {
    console.error("Query failed:", err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
}

queryAgentsDB();
