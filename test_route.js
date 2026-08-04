const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const mongoose = require('mongoose');

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const { CEO } = require('./src/models/CEO');
    const vijay = await CEO.findOne({ email: /vijay/i });
    const token = vijay.ragToken;

    // We will simulate the route handler logic for GET /analytics/pings
    const { listAgents, getVisitorSessions } = require('./src/services/agentAiService');

    async function testRoute(filter, startDate, endDate) {
      console.log(`\nTesting with: filter="${filter}", startDate="${startDate}", endDate="${endDate}"`);
      
      const agentsList = await listAgents(token);
      const nonRootAgents = (agentsList || []).filter(ag => ag.category !== 'root_assistant');

      let startLimit = null;
      let endLimit = null;

      if (filter === "today") {
        const now = new Date();
        startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (filter === "yesterday") {
        const now = new Date();
        startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      } else if (filter === "custom" || (!filter && (startDate || endDate))) {
        if (startDate) {
          const parts = startDate.split("-");
          if (parts.length === 3) {
            startLimit = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
        }
        if (endDate) {
          const parts = endDate.split("-");
          if (parts.length === 3) {
            endLimit = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
          }
        }
      }

      console.log('Parsed Limits:', { startLimit, endLimit });

      let totalPings = 0;
      for (const agent of nonRootAgents) {
        let agentSessions = await getVisitorSessions(agent.agent_id, token);
        console.log(`  Agent: ${agent.name}, Raw Sessions: ${agentSessions.length}`);

        // Filter sessions by date range if defined
        if (startLimit || endLimit) {
          agentSessions = agentSessions.filter(sess => {
            const sessTime = new Date(sess.created_at || sess.updated_at || 0);
            if (startLimit && sessTime < startLimit) return false;
            if (endLimit && sessTime > endLimit) return false;
            return true;
          });
        }
        console.log(`  Agent: ${agent.name}, Filtered Sessions: ${agentSessions.length}`);
        totalPings += agentSessions.length;
      }
      console.log('Total Pings Count:', totalPings);
    }

    // 1. Test Today
    await testRoute('today');
    
    // 2. Test 7 days (July 28 to Aug 4)
    await testRoute('custom', '2026-07-28', '2026-08-04');

    // 3. Test All
    await testRoute();

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
