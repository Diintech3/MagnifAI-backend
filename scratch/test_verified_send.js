const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testVerifiedSendCampaign() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  const cid = '6a84578e5bccf706d7b7dd37';
  console.log(`Testing POST http://localhost:4000/api/app/whatsapp/campaigns/${cid}/send ...`);

  try {
    const res = await axios.post(`http://localhost:4000/api/app/whatsapp/campaigns/${cid}/send`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Send Broadcast Result:', res.data);
  } catch (e) {
    console.error('Send Broadcast Error:', e.response?.status, e.response?.data || e.message);
  }

  await mongoose.disconnect();
}

testVerifiedSendCampaign();
