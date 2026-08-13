const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function checkSessionsFields() {
  const baseUrl = process.env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = process.env.UGC_AI_APP_TOKEN;
  const agentId = "b7981f6037ed62d0";

  try {
    console.log(`Fetching sessions from 3rdAI server for agent: ${agentId}...`);
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/sessions`, {
      headers: { "X-App-Token": token }
    });
    console.log("Number of sessions returned:", res.data.length);
    if (res.data.length > 0) {
      console.log("\n=== SAMPLE SESSION OBJECT ===");
      console.log(JSON.stringify(res.data[0], null, 2));
    } else {
      console.log("No sessions found for this agent.");
    }
  } catch (err) {
    console.error("API request failed:", err.message);
  }
}

checkSessionsFields();
