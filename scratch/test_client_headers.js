const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testWithClientHeaders() {
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
    'x-client-id': ceo.whatsAppClientId,
    'Content-Type': 'application/json'
  };

  // 1. Live Groups for this client
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Live Groups for client:', gRes.data?.data?.groups?.map(g => ({ name: g.name, id: g._id, count: g.contactCount })));

  // 2. Live Contacts for this client
  const cRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const contactsList = cRes.data?.data?.contacts || cRes.data?.contacts || [];
  console.log(`Live Contacts for client (${contactsList.length}):`);
  contactsList.forEach(c => console.log(`  - ID: ${c._id}, Name: "${c.name}", Phone: "${c.phone}", Group:`, c.group));

  // 3. Test adding "raj 2" (phone 916388633422) to "personal" group for this client
  let personalGroup = gRes.data?.data?.groups?.find(g => g.name.toLowerCase() === 'personal');
  if (!personalGroup) {
    console.log('Creating personal group for this client...');
    const createG = await axios.post(`${baseUrl}/api/contacts/groups`, { name: 'personal' }, { headers });
    personalGroup = createG.data?.data?.group || createG.data?.group;
  }
  console.log('Personal Group ID for client:', personalGroup._id);

  const phone = '916388633422';
  const existing = contactsList.find(c => (c.phone || '').replace(/[^0-9]/g, '').endsWith(phone.slice(-10)));
  console.log('Existing contact matched:', existing ? existing._id : 'NONE');

  if (existing) {
    const currentGroups = Array.isArray(existing.group) ? existing.group.map(g => g._id || g) : [];
    const updatedGroups = Array.from(new Set([...currentGroups, personalGroup._id]));
    const patchRes = await axios.patch(`${baseUrl}/api/contacts/${existing._id}`, { group: updatedGroups }, { headers });
    console.log('PATCH Result:', patchRes.data);
  }

  // 4. Verify Final Groups
  const gFinal = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('\nFinal Live Groups for client:');
  gFinal.data?.data?.groups?.forEach(g => console.log(`  - "${g.name}": ${g.contactCount} contacts`));

  await mongoose.disconnect();
}

testWithClientHeaders();
