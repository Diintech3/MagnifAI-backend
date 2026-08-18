const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testLiveConversationsApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/whatsapp/conversations ...');
  const res = await axios.get('http://localhost:4000/api/app/whatsapp/conversations', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const convs = res.data?.data?.conversations || res.data?.conversations || [];
  console.log(`Live Status: ${res.status}`);
  console.log(`Total live conversations returned for Lakshmi Raj Singh: ${convs.length}`);
  convs.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. Customer: "${c.customerName || c.name || c.phone}", Last: "${c.lastMessage}"`);
  });

  await mongoose.disconnect();
}

testLiveConversationsApi();
