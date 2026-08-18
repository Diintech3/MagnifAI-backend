const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCleanPatchWithoutClientId() {
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

  // 1. Live Groups on Whats AI
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Live Groups:', gRes.data?.data?.groups?.map(g => ({ name: g.name, id: g._id, count: g.contactCount })));

  let personalGroup = gRes.data?.data?.groups?.find(g => g.name.toLowerCase() === 'personal');
  if (!personalGroup) {
    const createG = await axios.post(`${baseUrl}/api/contacts/groups`, { name: 'personal' }, { headers });
    personalGroup = createG.data?.data?.group || createG.data?.group;
  }
  console.log('Personal Group:', personalGroup._id);

  // 2. Live Contacts
  const cRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const contactsList = cRes.data?.data?.contacts || [];
  console.log(`Live Contacts found: ${contactsList.length}`);

  // 3. Update all raj contacts to personal group
  for (const c of contactsList) {
    if ((c.name || '').toLowerCase().includes('raj')) {
      const currentGroups = Array.isArray(c.group) ? c.group.map(g => g._id || g) : [];
      const updated = Array.from(new Set([...currentGroups, personalGroup._id]));
      try {
        const patchRes = await axios.patch(`${baseUrl}/api/contacts/${c._id}`, { group: updated }, { headers });
        console.log(`Updated "${c.name}" to personal:`, patchRes.data?.message);
      } catch (e) {
        console.log(`Error updating "${c.name}":`, e.response ? e.response.data : e.message);
      }
    }
  }

  // 4. Check final groups
  const finalG = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('\nFinal Live Groups on Whats AI:');
  finalG.data?.data?.groups?.forEach(g => console.log(`  - "${g.name}": ${g.contactCount} contacts`));

  await mongoose.disconnect();
}

testCleanPatchWithoutClientId();
