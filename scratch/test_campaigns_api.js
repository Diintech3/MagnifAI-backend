const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCampaignsApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/whatsapp/campaigns ...');
  const res = await axios.get('http://localhost:4000/api/app/whatsapp/campaigns', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const campaigns = res.data?.data?.campaigns || res.data?.campaigns || [];
  console.log(`Live Campaigns count returned for Lakshmi Raj Singh: ${campaigns.length}`);
  campaigns.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. Name: "${c.name}", Status: "${c.status}", Total: ${c.totalContacts}, Sent: ${c.sentCount}`);
  });

  await mongoose.disconnect();
}

testCampaignsApi();
