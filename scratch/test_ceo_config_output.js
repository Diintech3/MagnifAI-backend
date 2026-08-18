const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testConfig() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO Lakshmi Raj Singh:');
  console.log('  AgentId:', ceo.agentId);
  console.log('  whatsAppPhoneId:', ceo.whatsAppPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log('  whatsAppWabaId:', ceo.whatsAppWabaId || process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log('  whatsAppToken exists:', Boolean(ceo.whatsAppToken || process.env.WHATSAPP_ACCESS_TOKEN));
  await mongoose.disconnect();
}

testConfig();
