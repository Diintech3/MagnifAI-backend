const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Group } = require('../src/models/Group');
const { Contact } = require('../src/models/Contact');

async function testAddContactToGroupFlow() {
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
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };

  // 1. Get live groups
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const liveGroups = gRes.data?.data?.groups || [];
  console.log('Live groups on Whats AI:', liveGroups.map(g => ({ name: g.name, id: g._id, count: g.contactCount })));

  let ashi = liveGroups.find(g => g.name.toLowerCase() === 'ashi');
  if (!ashi) {
    console.log('Creating ashi group on Whats AI...');
    const createG = await axios.post(`${baseUrl}/api/contacts/groups`, { name: 'ashi', description: 'Audience' }, { headers });
    ashi = createG.data?.data?.group || createG.data?.group;
  }
  console.log('Target Group ashi ID:', ashi._id);

  // 2. Add "anand" (phone 07970906978) to ashi
  console.log('Adding "anand" (07970906978) to group "ashi"...');
  try {
    const res = await axios.post(`${baseUrl}/api/contacts`, {
      name: 'anand',
      phone: '07970906978'.replace(/[^0-9]/g, ''),
      group: [ashi._id],
      tags: ['Lead']
    }, { headers });
    console.log('Result for anand:', res.data?.message);
  } catch (e) {
    console.log('Create error (checking fallback PATCH):', e.response ? e.response.data?.message : e.message);
  }

  // 3. Verify final group counts
  const gFinal = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('\nFinal Live Groups on Whats AI:');
  gFinal.data?.data?.groups?.forEach(g => {
    console.log(`  - "${g.name}": ${g.contactCount} contacts`);
  });

  await mongoose.disconnect();
}

testAddContactToGroupFlow();
