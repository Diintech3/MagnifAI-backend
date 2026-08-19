const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testSyncLakshmiRaj() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;

  console.log('Testing sync-client on AdplifAI for Lakshmi Raj Singh...');
  try {
    const res = await axios.post(`${baseUrl.replace(/\/$/, '')}/partner/sync-client`, {
      name: ceo.name,
      email: ceo.email,
      phone: ceo.mobile,
      businessName: ceo.company || 'Lakshmi Raj Enterprises'
    }, {
      headers: {
        'x-partner-secret': partnerSecret,
        'Content-Type': 'application/json'
      }
    });

    console.log('Sync Client Response Status:', res.status);
    console.log('Sync Client Response Data:', res.data);
  } catch (e) {
    console.error('Sync Client Error:', e.response?.status, e.response?.data || e.message);
  }

  await mongoose.disconnect();
}

testSyncLakshmiRaj();
