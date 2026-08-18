const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testPutCampaign() {
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

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-api-key': partnerKey,
    'x-client-id': ceo.whatsAppClientId,
    'Content-Type': 'application/json'
  };

  const cid = '6a84578e5bccf706d7b7dd37';

  // Try PUT
  try {
    const putRes = await axios.put(`${baseUrl}/api/campaigns/${cid}`, {
      status: 'completed',
      sent: 10,
      delivered: 10,
      totalContacts: 10
    }, { headers });
    console.log('PUT Response:', putRes.data);
  } catch (e) {
    console.error('PUT Error:', e.response?.status, e.response?.data || e.message);
  }

  // Try POST /api/campaigns/:id/send on Whats AI
  try {
    const sRes = await axios.post(`${baseUrl}/api/campaigns/${cid}/send`, {}, { headers });
    console.log('POST /send Response:', sRes.data);
  } catch (e) {
    console.error('POST /send Error:', e.response?.status, e.response?.data || e.message);
  }

  await mongoose.disconnect();
}

testPutCampaign();
