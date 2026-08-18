const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { listAgents } = require('../src/services/agentAiService');

async function testAgents() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO found:', ceo.name, 'ragToken exists:', Boolean(ceo.ragToken));

  if (ceo.ragToken) {
    try {
      const agents = await listAgents(ceo.ragToken);
      console.log('Agents fetched from vectorize service:', agents);
    } catch (e) {
      console.log('Error listing agents:', e.message);
    }
  }

  await mongoose.disconnect();
}

testAgents();
