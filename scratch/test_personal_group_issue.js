const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Group } = require('../src/models/Group');
const { CEO } = require('../src/models/CEO');

async function testPersonalGroupIssue() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const mongoGroups = await Group.find({ ceoId: ceo._id });
  console.log('MongoDB Groups:', mongoGroups.map(g => ({ name: g.name, id: g._id.toString() })));

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
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };

  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Whats AI Live Groups:', gRes.data?.data?.groups?.map(g => ({ name: g.name, id: g._id })));

  // Simulate what happens when frontend sends group = "6a83f97d440257830ca87dc8" (MongoDB ID of 'personal')
  const mongoPersonalId = mongoGroups.find(g => g.name === 'personal')._id.toString();
  console.log('\nTesting POST to Whats AI with MongoDB personal ID:', mongoPersonalId);

  try {
    const postRes = await axios.post(`${baseUrl}/api/contacts`, {
      name: 'raj',
      phone: '918726525782',
      group: [mongoPersonalId]
    }, { headers });
    console.log('POST Result:', postRes.data);
  } catch (err) {
    console.log('POST Error:', err.response ? err.response.data : err.message);
  }

  await mongoose.disconnect();
}

testPersonalGroupIssue();
