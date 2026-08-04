const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const mongoose = require('mongoose');

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in env!');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const { CEO } = require('./src/models/CEO');
    const vijay = await CEO.findOne({ email: /vijay/i });
    if (!vijay) {
      console.log('Vijay CEO not found in DB!');
      await mongoose.disconnect();
      return;
    }
    const token = vijay.ragToken;
    console.log('Vijay RAG Token:', token);

    // Call external server to fetch agents
    const listRes = await fetch('https://vectorize.diintech.com/api/agents', {
      headers: { "X-App-Token": token }
    });
    const agents = await listRes.json();
    console.log('Vijay Agents:', agents.map(a => ({ agent_id: a.agent_id, name: a.name })));

    // Fetch sessions
    for (const agent of agents) {
      if (agent.category === 'root_assistant') continue;
      const sessRes = await fetch(`https://vectorize.diintech.com/api/agents/${agent.agent_id}/sessions`, {
        headers: { "X-App-Token": token }
      });
      const sessions = await sessRes.json();
      console.log(`Agent ${agent.name} (${agent.agent_id}) has ${sessions.length} sessions.`);
      
      const now = new Date();
      // Test filter "7 Days": July 28 to Aug 4
      const startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const endLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const filtered = sessions.filter(sess => {
        const sessTime = new Date(sess.created_at || sess.updated_at || 0);
        return sessTime >= startLimit && sessTime <= endLimit;
      });

      console.log(`  Filtered (7 Days) Sessions Count: ${filtered.length}`);
      sessions.slice(0, 5).forEach((s, idx) => {
        console.log(`  Session ${idx}: id=${s.session_id}, created_at=${s.created_at}, updated_at=${s.updated_at}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
