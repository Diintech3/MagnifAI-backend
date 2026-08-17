const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function listRagAgents() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    const { CEO } = require("../src/models/CEO");
    const { listAgents } = require("../src/services/agentAiService");

    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    if (ceo && ceo.ragToken) {
      console.log(`Fetching agents for RAG Client: ${ceo.ragClientId}`);
      const agents = await listAgents(ceo.ragToken);
      console.log("\nAgents returned from RAG Service:");
      console.log(JSON.stringify(agents, null, 2));
    } else {
      console.log("CEO or RAG Token not found.");
    }
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await mongoose.disconnect();
  }
}

listRagAgents();
