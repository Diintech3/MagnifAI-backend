const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function inspectData() {
  const baseUrl = process.env.UGC_AI_BASE_URL || "https://vectorize.diintech.com";
  const token = process.env.UGC_AI_APP_TOKEN;

  console.log("Base URL:", baseUrl);
  console.log("Token:", token ? token.substring(0, 10) + "..." : "undefined");

  if (!token) {
    console.error("No token found in env!");
    return;
  }

  try {
    console.log("\n1. Fetching agents...");
    const agentsRes = await axios.get(`${baseUrl}/api/agents`, {
      headers: { "X-App-Token": token }
    });
    const agents = agentsRes.data;
    console.log(`Fetched ${agents.length} agents.`);
    if (agents.length === 0) return;

    // Pick first non-root agent
    const agent = agents.find(a => a.category !== "root_assistant") || agents[0];
    console.log(`\nUsing Agent: ${agent.name} (${agent.agent_id})`);

    console.log("\n2. Fetching sessions for agent...");
    const sessionsRes = await axios.get(`${baseUrl}/api/agents/${agent.agent_id}/sessions`, {
      headers: { "X-App-Token": token }
    });
    const sessions = sessionsRes.data;
    console.log(`Fetched ${sessions.length} sessions.`);
    if (sessions.length === 0) return;

    const sampleSession = sessions[0];
    console.log("\nSample Session structure:", JSON.stringify(sampleSession, null, 2));

    console.log("\n3. Fetching message history for session:", sampleSession.session_id);
    const historyRes = await axios.get(`${baseUrl}/api/agents/sessions/${sampleSession.session_id}/history`, {
      headers: { "X-App-Token": token }
    });
    const history = historyRes.data;
    console.log(`Fetched ${history.length} messages.`);
    if (history.length > 0) {
      console.log("\nSample Message structure:", JSON.stringify(history[0], null, 2));
    }
  } catch (err) {
    console.error("Error inspecting data:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

inspectData();
