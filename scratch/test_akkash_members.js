const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testAkkashMembers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  const res = await axios.get('http://localhost:4000/api/app/whatsapp/groups/6a82d07424d0dbb08e022ac7/members', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Members in Akkash group returned by API:');
  const members = res.data?.data?.members || res.data?.members || [];
  console.log(`Count: ${members.length}`);
  members.forEach(m => {
    console.log(`- Name: "${m.name}", Phone: "${m.phone}", Source: "${m.source}"`);
  });

  await mongoose.disconnect();
}

testAkkashMembers();
