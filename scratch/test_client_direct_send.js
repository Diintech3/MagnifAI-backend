const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testClientDirectSend() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const baseUrl = 'https://w-a-backend.onrender.com';
  const partnerKey = 'wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b';
  const apiKey = 'whatsai-core-master-secret-key-2026';

  // Let's get the client-specific token for Lakshami Raj Singh
  const loginRes = await axios.post(`${baseUrl}/api/auth/api-sharing-client-login`, {
    apiSharingKey: partnerKey,
    clientId: ceo.whatsAppClientId,
    clientPhone: ceo.phone
  }, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });

  const clientToken = loginRes.data?.data?.accessToken;
  console.log('Client Direct Token obtained:', !!clientToken);

  const cid = '6a8446ef5bccf706d7b7d600';

  const endpoints = [
    { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/send` },
    { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/start` },
    { method: 'patch', url: `${baseUrl}/api/campaigns/${cid}`, body: { status: 'scheduled' } },
    { method: 'patch', url: `${baseUrl}/api/campaigns/${cid}`, body: { status: 'completed' } },
    { method: 'get', url: `${baseUrl}/api/campaigns/${cid}` }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios({
        method: ep.method,
        url: ep.url,
        data: ep.body || {},
        headers: {
          Authorization: `Bearer ${clientToken}`,
          'x-api-key': partnerKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[CLIENT-TOKEN SUCCESS] ${ep.method.toUpperCase()} ${ep.url}:`, res.data);
    } catch (e) {
      console.log(`[CLIENT-TOKEN FAILED] ${ep.method.toUpperCase()} ${ep.url}:`, e.response?.status, e.response?.data);
    }
  }

  await mongoose.disconnect();
}

testClientDirectSend();
