const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Contact } = require('../src/models/Contact');
const { Group } = require('../src/models/Group');
const { CEO } = require('../src/models/CEO');

async function syncAkkashGroupToWhatsAi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const akkashGroup = await Group.findOne({ ceoId: ceo._id, name: 'Akkash' });
  console.log('Found MongoDB Akkash group:', akkashGroup._id, 'members:', akkashGroup.members);

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

  // 1. Get or Create "Akkash" on Whats AI
  const groupsListRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const liveGroups = groupsListRes.data?.data?.groups || groupsListRes.data?.groups || [];
  let akkashLive = liveGroups.find(g => g.name.toLowerCase() === 'akkash');
  if (!akkashLive) {
    console.log('Creating Akkash group on Whats AI...');
    const createG = await axios.post(`${baseUrl}/api/contacts/groups`, {
      name: 'Akkash',
      description: 'Synced from MagnifAI'
    }, { headers });
    akkashLive = createG.data?.data?.group || createG.data?.group;
  }
  console.log('Live Akkash Group ID:', akkashLive._id);

  // 2. Add members to Akkash on Whats AI
  const memberContacts = await Contact.find({ _id: { $in: akkashGroup.members } });
  console.log(`Adding ${memberContacts.length} contacts to Akkash on Whats AI...`);

  for (const c of memberContacts) {
    try {
      const res = await axios.post(`${baseUrl}/api/contacts`, {
        name: c.name,
        phone: c.phone.replace(/[^0-9]/g, ''),
        email: c.email || undefined,
        group: [akkashLive._id],
        tags: ['Synced']
      }, { headers });
      console.log(`  Added "${c.name}" (${c.phone}):`, res.data?.message);
    } catch (e) {
      console.log(`  Skip "${c.name}":`, e.response ? e.response.data?.message : e.message);
    }
  }

  // 3. Verify final count
  const checkGroups = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Final Live Groups:', JSON.stringify(checkGroups.data, null, 2));

  await mongoose.disconnect();
}

syncAkkashGroupToWhatsAi();
