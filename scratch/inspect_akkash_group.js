const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Group } = require('../src/models/Group');
const { Contact } = require('../src/models/Contact');

async function inspectAkkashGroup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  console.log('=== MONGODB GROUPS FOR CEO ===');
  const mongoGroups = await Group.find({ ceoId: ceo._id });
  for (const g of mongoGroups) {
    const contactIds = g.contactIds || [];
    const contacts = await Contact.find({ _id: { $in: contactIds } });
    console.log(`\nMongoDB Group "${g.name}" (ID: ${g._id}) - total contactIds: ${contactIds.length}`);
    contacts.forEach(c => console.log(`  - Name: "${c.name}", Phone: "${c.phone}", Source: "${c.source}"`));
  }

  // Check Whats AI
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

  console.log('\n=== WHATS AI GROUPS ===');
  const gListRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const waGroups = gListRes.data?.data?.groups || gListRes.data?.groups || [];
  for (const g of waGroups) {
    console.log(`\nWhats AI Group "${g.name}" (ID: ${g._id}) - contactCount: ${g.contactCount}`);
  }

  console.log('\n=== ALL WHATS AI CONTACTS WITH GROUP TAGS ===');
  const cListRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const waContacts = cListRes.data?.data?.contacts || cListRes.data?.contacts || [];
  console.log(`Total Contacts on Whats AI: ${waContacts.length}`);
  waContacts.forEach(c => {
    const groupNames = Array.isArray(c.group) ? c.group.map(g => g.name || g._id || g) : [c.group];
    console.log(`  - Name: "${c.name}", Phone: "${c.phone}", Groups: ${JSON.stringify(groupNames)}`);
  });

  await mongoose.disconnect();
}

inspectAkkashGroup();
