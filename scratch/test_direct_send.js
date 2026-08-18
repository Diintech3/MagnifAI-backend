const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testDirectSendEndpoint() {
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

  // 1. Without x-client-id
  console.log('Sending WITHOUT x-client-id:');
  try {
    const s1 = await axios.post(`${baseUrl}/api/campaigns/6a8443d15bccf706d7b7d420/send`, {}, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey }
    });
    console.log('Success 1:', s1.data);
  } catch (e) {
    console.log('Error 1:', e.response ? e.response.data : e.message);
  }

  // 2. With x-client-id
  console.log('\nSending WITH x-client-id:');
  try {
    const s2 = await axios.post(`${baseUrl}/api/campaigns/6a8443d15bccf706d7b7d420/send`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': partnerKey,
        'x-client-id': ceo.whatsAppClientId
      }
    });
    console.log('Success 2:', s2.data);
  } catch (e) {
    console.log('Error 2:', e.response ? e.response.data : e.message);
  }

  await mongoose.disconnect();
}

testDirectSendEndpoint();
