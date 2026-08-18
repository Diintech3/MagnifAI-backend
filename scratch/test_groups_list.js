const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testGroupsList() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  const res = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Groups returned from GET /api/app/whatsapp/groups:');
  const groups = res.data?.data?.groups || res.data || [];
  groups.forEach(g => {
    console.log(`- Name: "${g.name}", ID: ${g._id || g.id}, contactCount: ${g.contactCount}`);
  });

  await mongoose.disconnect();
}

testGroupsList();
