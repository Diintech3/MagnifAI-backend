const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const Agent = require('../src/models/Agent');

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const ceos = await CEO.find({}).lean();
  console.log(`Found ${ceos.length} CEOs in database:`);
  ceos.forEach(c => {
    console.log(`\nCEO ID: ${c._id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Email: ${c.email}`);
    console.log(`  whatsAppClientId: ${c.whatsAppClientId}`);
    console.log(`  whatsAppPhoneId: ${c.whatsAppPhoneId}`);
    console.log(`  whatsAppWabaId: ${c.whatsAppWabaId}`);
    console.log(`  whatsAppToken: ${c.whatsAppToken ? 'EXISTS' : 'EMPTY'}`);
    console.log(`  whatsappConfigured: ${c.whatsappConfigured}`);
    console.log(`  whatsAppSendMode: ${c.whatsAppSendMode}`);
    console.log(`  agentId: ${c.agentId || c.aiAgentId || c.agent}`);
  });

  const agents = await Agent.find({}).lean();
  console.log(`\nFound ${agents.length} Agents in database:`);
  agents.forEach(a => {
    console.log(`Agent ID: ${a._id}, Name: ${a.name || a.agentName}, CEO: ${a.ceoId || a.ceo || a.appId}, Model: ${a.model || a.agentType}`);
  });

  await mongoose.disconnect();
}

checkData();
