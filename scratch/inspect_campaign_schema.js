const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function inspectExistingCampaignSchema() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

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

  const res = await axios.get(`${baseUrl}/api/campaigns`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-key': partnerKey,
      'x-client-id': ceo.whatsAppClientId
    }
  });

  const campaigns = res.data?.data?.campaigns || [];
  console.log(`Found ${campaigns.length} campaigns on Whats AI.`);
  console.log('Sample campaign 1:', JSON.stringify(campaigns[0], null, 2));
  console.log('\nSample campaign 2:', JSON.stringify(campaigns[1], null, 2));

  await mongoose.disconnect();
}

inspectExistingCampaignSchema();
