const { listAgents, getVisitorSessions } = require("../src/services/agentAiService");

async function checkVijaySessions() {
  const token = "clt-f41cf4fa75ab78c66ea8d103328e7e17812f8e1fa5f1ae52"; // Vijay Kumar Singh's RAG Token
  const agentId = "61cacd3104a8612e"; // Vijay's Agent ID
  
  try {
    console.log(`Fetching sessions for Vijay's agent: ${agentId}...`);
    const sessions = await getVisitorSessions(agentId, token);
    console.log(`Found ${sessions ? sessions.length : 0} total sessions on Vectorize.`);
    if (sessions && sessions.length > 0) {
      sessions.forEach((sess, idx) => {
        console.log(`  [Session ${idx+1}] ID: ${sess.session_id}, User Name: ${sess.user_name}, Phone: ${sess.phone_number}, Device: ${sess.device_name}`);
      });
      
      const telephony = sessions.filter(s => s.session_id?.startsWith("tel_") || s.device_name === "Voice Call");
      console.log(`\nFiltered Telephony (Voice Call) Sessions count: ${telephony.length}`);
      if (telephony.length > 0) {
        telephony.forEach((sess, idx) => {
          console.log(`  [Voice Call ${idx+1}] ID: ${sess.session_id}, Caller: ${sess.phone_number}, Name: ${sess.user_name}`);
        });
      }
    }
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
}

checkVijaySessions();
