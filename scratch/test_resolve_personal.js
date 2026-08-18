const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Group } = require('../src/models/Group');
const { CEO } = require('../src/models/CEO');

async function testAutoResolveAndAddPersonal() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const mongoPersonalGroup = await Group.findOne({ ceoId: ceo._id, name: 'personal' });
  console.log('MongoDB personal Group:', mongoPersonalGroup._id.toString());

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

  // 1. Fetch live groups
  const listG = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const liveGroups = listG.data?.data?.groups || [];
  
  // 2. Resolve target "6a83f97d440257830ca87dc8" (MongoDB ID)
  const target = mongoPersonalGroup._id.toString();
  let resolvedGroupId = null;

  const foundOnWhatsAi = liveGroups.find(g => g._id === target || g.name.toLowerCase() === 'personal');
  if (foundOnWhatsAi) {
    resolvedGroupId = foundOnWhatsAi._id;
  } else {
    console.log('Group not on Whats AI, creating "personal" group on Whats AI...');
    const createG = await axios.post(`${baseUrl}/api/contacts/groups`, {
      name: 'personal',
      description: 'Synced from MagnifAI'
    }, { headers });
    resolvedGroupId = createG.data?.data?.group?._id || createG.data?.group?._id;
  }
  console.log('Resolved Whats AI Group ID for personal:', resolvedGroupId);

  // 3. Add "raj" to "personal"
  const phone = '918726525782';
  const listC = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const existing = (listC.data?.data?.contacts || []).find(c => (c.phone || '').includes('8726525782'));

  if (existing) {
    const currentGroups = (existing.group || []).map(g => g._id || g);
    const updated = Array.from(new Set([...currentGroups, resolvedGroupId]));
    const patchRes = await axios.patch(`${baseUrl}/api/contacts/${existing._id}`, { group: updated }, { headers });
    console.log('PATCH raj to personal result:', patchRes.data?.message);
  }

  // 4. Verify live counts
  const finalG = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('\nFinal Live Groups on Whats AI:');
  finalG.data?.data?.groups?.forEach(g => {
    console.log(`  - "${g.name}": ${g.contactCount} contacts (ID: ${g._id})`);
  });

  await mongoose.disconnect();
}

testAutoResolveAndAddPersonal();
