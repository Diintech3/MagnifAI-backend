const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCampaignsEndpoint() {
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
  console.log(`Returned ${campaigns.length} campaigns:`);
  campaigns.forEach(c => {
    console.log(`- Campaign: "${c.name}", Status: "${c.status}", Sent: ${c.sent}/${c.totalContacts}`);
  });

  await mongoose.disconnect();
}

testCampaignsEndpoint();
