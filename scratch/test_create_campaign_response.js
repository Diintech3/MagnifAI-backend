const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCreateCampaignPayload() {
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

  // Get Akkash group
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const akkashGroup = gRes.data?.data?.groups?.find(g => g.name.toLowerCase() === 'akkash');

  // Get Ai Assistant template
  const tRes = await axios.get(`${baseUrl}/api/templates`, { headers });
  const aiTemplate = tRes.data?.data?.templates?.find(t => t.name.toLowerCase().includes('ai'));

  console.log('Target Group ID:', akkashGroup?._id);
  console.log('Template ID:', aiTemplate?._id);

  const createRes = await axios.post(`${baseUrl}/api/campaigns`, {
    name: 'test debug campaign',
    template: aiTemplate._id,
    targetGroup: akkashGroup._id
  }, { headers });

  console.log('\nCreate Campaign Full Response:');
  console.log(JSON.stringify(createRes.data, null, 2));

  await mongoose.disconnect();
}

testCreateCampaignPayload();
