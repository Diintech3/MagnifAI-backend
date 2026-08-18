const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testClientIdHeaderIssue() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO whatsAppClientId:', ceo.whatsAppClientId);

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

  // 1. Without x-client-id
  const headersWithoutClient = {
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };
  const listWithout = await axios.get(`${baseUrl}/api/contacts`, { headers: headersWithoutClient });
  console.log('Contacts count WITHOUT x-client-id:', (listWithout.data?.data?.contacts || listWithout.data?.contacts || []).length);

  // 2. With x-client-id
  if (ceo.whatsAppClientId) {
    const headersWithClient = {
      ...headersWithoutClient,
      'x-client-id': ceo.whatsAppClientId
    };
    try {
      const listWith = await axios.get(`${baseUrl}/api/contacts`, { headers: headersWithClient });
      console.log('Contacts count WITH x-client-id:', (listWith.data?.data?.contacts || listWith.data?.contacts || []).length);
    } catch (e) {
      console.log('Error with x-client-id:', e.response ? e.response.data : e.message);
    }
  }

  await mongoose.disconnect();
}

testClientIdHeaderIssue();
