const { listAgents, getVisitorSessions } = require("../src/services/agentAiService");

async function checkLakshamiSessions() {
  const token = "clt-a8d247b129ef9358ffd2a070a328b3d8d397fbbffa582e34"; // Lakshami Raj Singh's RAG Token
  
  try {
    console.log("Fetching agents for Lakshami Raj Singh...");
    const agents = await listAgents(token);
    console.log(`Found ${agents.length} agents:`);
    agents.forEach(ag => {
      console.log(`- Agent Name: ${ag.name}, ID: ${ag.agent_id || ag.id}, Category: ${ag.category}`);
    });

    const nonRoot = agents.filter(ag => ag.category !== "root_assistant");
    for (const ag of nonRoot) {
      const agId = ag.agent_id || ag.id;
      console.log(`\nFetching visitor sessions for agent: ${ag.name} (${agId})...`);
      const sessions = await getVisitorSessions(agId, token);
      console.log(`Found ${sessions ? sessions.length : 0} sessions.`);
      if (sessions && sessions.length > 0) {
        sessions.forEach((sess, idx) => {
          console.log(`  [Session ${idx+1}] ID: ${sess.session_id}, User Name: ${sess.user_name}, Phone: ${sess.phone_number}, Platform: ${sess.platform}`);
        });
      }
    }
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
}

checkLakshamiSessions();
