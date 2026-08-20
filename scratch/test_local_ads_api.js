const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testLocalAdsApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/ads/campaigns ...');
  try {
    const res = await axios.get('http://localhost:4000/api/app/ads/campaigns', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n=== RESPONSE FROM LOCAL API ===');
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error calling local API:', error.response?.data || error.message);
  }

  await mongoose.disconnect();
}

testLocalAdsApi();
