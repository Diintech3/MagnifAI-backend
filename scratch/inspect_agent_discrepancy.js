const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { listAgents } = require('../src/services/agentAiService');

async function inspectCeoAgent() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' }).lean();
  console.log('MongoDB CEO Record:');
  console.log('  Name:', ceo.name);
  console.log('  Email:', ceo.email);
  console.log('  Stored agentId in MongoDB:', ceo.agentId);
  console.log('  ragToken:', ceo.ragToken ? 'EXISTS' : 'NONE');

  if (ceo.ragToken) {
    const rawAgents = await listAgents(ceo.ragToken);
    console.log('\nReal Agents in Vectorize Service:');
    rawAgents.forEach(a => {
      console.log(`  - Name: "${a.name || a.agent_name}", ID: "${a.agent_id || a.id}", Category: "${a.category}"`);
    });
  }

  await mongoose.disconnect();
}

inspectCeoAgent();
