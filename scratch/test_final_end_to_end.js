const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testFinalEndToEnd() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('1. Checking GET /api/app/whatsapp/groups ...');
  const gRes = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Groups:');
  (gRes.data?.data?.groups || gRes.data?.groups || []).forEach(g => {
    console.log(`- ${g.name} (${g.contactCount} Contacts)`);
  });

  console.log('\n2. Testing Send on Campaign "raaj ko api chahiye" ...');
  const sendRes = await axios.post('http://localhost:4000/api/app/whatsapp/campaigns/6a84578e5bccf706d7b7dd37/send', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Send Response:', sendRes.data);

  await mongoose.disconnect();
}

testFinalEndToEnd();
