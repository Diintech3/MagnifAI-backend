const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testDraftSendOnWhatsAi() {
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

  const cid = '6a8446ef5bccf706d7b7d600'; // anand camp

  // Let's test what happens when we update status or scheduledAt or call send
  console.log('Testing campaign triggers on Whats AI...');

  // 1. PATCH status to scheduled or active
  try {
    const patchRes = await axios.patch(`${baseUrl}/api/campaigns/${cid}`, {
      status: 'active'
    }, { headers });
    console.log('[PATCH status: active]:', patchRes.data);
  } catch (e) {
    console.log('[PATCH status: active error]:', e.response?.status, e.response?.data);
  }

  // 2. Direct broadcast via inbox/send-template if needed
  // Let's check template message endpoint for individual numbers in group
  console.log('\nTesting group contacts for this campaign:');
  const campRes = await axios.get(`${baseUrl}/api/campaigns/${cid}`, { headers });
  const camp = campRes.data?.data?.campaign;
  console.log('Campaign details:', camp);

  const groupRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const grp = groupRes.data?.data?.groups?.find(g => g._id === camp.targetGroup);
  console.log('Target Group:', grp);

  await mongoose.disconnect();
}

testDraftSendOnWhatsAi();
