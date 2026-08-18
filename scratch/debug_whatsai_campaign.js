const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function debugWhatsAiCampaignModel() {
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

  // Let's inspect the campaign 6a8446ef5bccf706d7b7d600
  const cid = '6a8446ef5bccf706d7b7d600';
  console.log('Inspecting campaign on Whats AI:', cid);

  // Try GET /api/campaigns/:id with and without x-client-id
  try {
    const r1 = await axios.get(`${baseUrl}/api/campaigns/${cid}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey, 'x-client-id': ceo.whatsAppClientId }
    });
    console.log('GET with x-client-id:', r1.data);
  } catch (e) {
    console.log('GET with x-client-id error:', e.response?.data);
  }

  try {
    const r2 = await axios.get(`${baseUrl}/api/campaigns/${cid}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey }
    });
    console.log('GET without x-client-id:', r2.data);
  } catch (e) {
    console.log('GET without x-client-id error:', e.response?.data);
  }

  // Check one of the completed campaigns from earlier (e.g. 6a75f03e9dafc6dfa973342d)
  const completedCid = '6a75f03e9dafc6dfa973342d';
  console.log('\nInspecting completed campaign:', completedCid);
  try {
    const r3 = await axios.get(`${baseUrl}/api/campaigns/${completedCid}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey, 'x-client-id': ceo.whatsAppClientId }
    });
    console.log('Completed Campaign Detail:', r3.data);
  } catch (e) {
    console.log('Completed Campaign error:', e.response?.data);
  }

  await mongoose.disconnect();
}

debugWhatsAiCampaignModel();
