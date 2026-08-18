const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function inspectCampaigns() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  // 1. Check MongoDB Campaign collection
  const mongoCampaigns = await mongoose.connection.db.collection('campaigns').find({}).toArray();
  console.log(`=== MONGODB CAMPAIGNS (${mongoCampaigns.length}) ===`);
  mongoCampaigns.forEach(c => console.log('  -', JSON.stringify(c)));

  // 2. Check Whats AI campaigns endpoints
  const baseUrl = 'https://w-a-backend.onrender.com';
  const partnerKey = 'wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b';
  const clientToken = 'wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0';
  const ref = 'wa_ref_5079ca47a979a4c5aefa228c9834bd4e';
  const apiKey = 'whatsai-core-master-secret-key-2026';

  const loginRes = await axios.post(`${baseUrl}/api/auth/api-sharing-login`, {
    apiSharingKey: partnerKey,
    accessToken: clientToken,
    referenceKey: ref
  }, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  const token = loginRes.data.data.accessToken;

  // 2a. Without x-client-id
  console.log('\n=== WHATS AI CAMPAIGNS (without x-client-id) ===');
  try {
    const r1 = await axios.get(`${baseUrl}/api/campaigns`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey }
    });
    console.log('Count:', r1.data?.data?.campaigns?.length || r1.data?.campaigns?.length, r1.data);
  } catch (e) {
    console.log('Error without x-client-id:', e.response ? e.response.data : e.message);
  }

  // 2b. With x-client-id
  if (ceo.whatsAppClientId) {
    console.log(`\n=== WHATS AI CAMPAIGNS (with x-client-id: ${ceo.whatsAppClientId}) ===`);
    try {
      const r2 = await axios.get(`${baseUrl}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey, 'x-client-id': ceo.whatsAppClientId }
      });
      console.log('Count:', r2.data?.data?.campaigns?.length || r2.data?.campaigns?.length, r2.data);
    } catch (e) {
      console.log('Error with x-client-id:', e.response ? e.response.data : e.message);
    }
  }

  await mongoose.disconnect();
}

inspectCampaigns();
