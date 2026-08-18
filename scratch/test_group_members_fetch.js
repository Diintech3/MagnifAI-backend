const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Group } = require('../src/models/Group');
const { Contact } = require('../src/models/Contact');

async function testGroupMembersFetchAndSync() {
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

  // 1. Get Live Groups
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const liveGroups = gRes.data?.data?.groups || [];
  console.log('Live Groups on Whats AI:', liveGroups.map(g => ({ name: g.name, id: g._id, count: g.contactCount })));

  // Target: "personal" group
  const personalGroup = liveGroups.find(g => g.name.toLowerCase() === 'personal');
  console.log('\nTarget personal group ID on Whats AI:', personalGroup._id);

  // 2. Fetch all contacts from Whats AI & MongoDB for this group
  const cRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const waContacts = cRes.data?.data?.contacts || [];
  
  // Contacts assigned to personal on Whats AI
  const waGroupMembers = waContacts.filter(c => {
    const groupArr = Array.isArray(c.group) ? c.group : [c.group].filter(Boolean);
    return groupArr.some(g => (g._id || g) === personalGroup._id || (g.name || g) === 'personal');
  });

  console.log(`Members in "personal" on Whats AI (${waGroupMembers.length}):`);
  waGroupMembers.forEach(m => console.log(`  - "${m.name}" (${m.phone})`));

  // MongoDB group members
  const mongoGroup = await Group.findOne({ ceoId: ceo._id, name: 'personal' });
  if (mongoGroup) {
    const mongoMembers = await Contact.find({ _id: { $in: mongoGroup.members } });
    console.log(`Members in "personal" on MongoDB (${mongoMembers.length}):`);
    mongoMembers.forEach(m => console.log(`  - "${m.name}" (${m.phone})`));
  }

  await mongoose.disconnect();
}

testGroupMembersFetchAndSync();
