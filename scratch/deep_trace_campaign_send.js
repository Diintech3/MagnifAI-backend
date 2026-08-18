const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Group } = require('../src/models/Group');
const { Contact } = require('../src/models/Contact');

async function deepTraceCampaignSend() {
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

  // 1. Find campaign "raaj ko api chahiye"
  console.log('=== STEP 1: FINDING CAMPAIGN "raaj ko api chahiye" ===');
  const cListRes = await axios.get(`${baseUrl}/api/campaigns`, { headers });
  const allCampaigns = cListRes.data?.data?.campaigns || [];
  const targetCampaign = allCampaigns.find(c => c.name.toLowerCase().includes('raaj ko api'));
  console.log('Target Campaign Object:', JSON.stringify(targetCampaign, null, 2));

  if (!targetCampaign) {
    console.log('Campaign not found in list!');
    await mongoose.disconnect();
    return;
  }

  // 2. Inspect target group
  console.log('\n=== STEP 2: INSPECTING TARGET GROUP ===');
  console.log('campaign.targetGroup is:', targetCampaign.targetGroup);

  // Check MongoDB Group
  const mongoGroupById = await Group.findOne({ ceoId: ceo._id, _id: mongoose.Types.ObjectId.isValid(targetCampaign.targetGroup) ? targetCampaign.targetGroup : null });
  const mongoGroupByName = await Group.findOne({ ceoId: ceo._id, name: targetCampaign.targetGroup });
  console.log('MongoDB Group by ID:', mongoGroupById);
  console.log('MongoDB Group by Name:', mongoGroupByName);

  // Check Whats AI Group
  const gListRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const waGroups = gListRes.data?.data?.groups || [];
  const waGroup = waGroups.find(g => g._id === targetCampaign.targetGroup || g.name.toLowerCase() === targetCampaign.targetGroup.toLowerCase());
  console.log('Whats AI Group:', waGroup);

  // 3. Inspect what contacts belong to this group
  console.log('\n=== STEP 3: CONTACTS BELONGING TO THIS GROUP ===');
  let targetContacts = [];
  const activeGroup = mongoGroupById || mongoGroupByName;
  if (activeGroup && activeGroup.contactIds && activeGroup.contactIds.length > 0) {
    targetContacts = await Contact.find({ _id: { $in: activeGroup.contactIds }, ceoId: ceo._id });
    console.log(`Found ${targetContacts.length} contacts in MongoDB Group "${activeGroup.name}":`);
    targetContacts.forEach(c => console.log(`  - "${c.name}", Phone: "${c.phone}"`));
  } else {
    console.log('MongoDB Group has 0 contactIds!');
  }

  // Check Whats AI Contacts
  const cRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const waContacts = cRes.data?.data?.contacts || [];
  const matchingWaContacts = waContacts.filter(c => {
    if (Array.isArray(c.group)) {
      return c.group.some(g => (g._id || g) === targetCampaign.targetGroup || (g.name || g).toLowerCase() === 'akkash');
    }
    return false;
  });
  console.log(`Found ${matchingWaContacts.length} contacts on Whats AI with group "Akkash":`);
  matchingWaContacts.forEach(c => console.log(`  - "${c.name}", Phone: "${c.phone}"`));

  // 4. Try sending to the actual phone numbers using send-template
  console.log('\n=== STEP 4: TESTING DIRECT SEND-TEMPLATE TO EACH NUMBER ===');
  const testPhones = [
    { name: 'Anand', phone: '917970906978' },
    { name: 'Raj', phone: '918726525782' },
    { name: 'Raj 2', phone: '916388633422' }
  ];

  for (const p of testPhones) {
    console.log(`\nSending to ${p.name} (${p.phone}) with template "ai_assistant"...`);
    try {
      const sendRes = await axios.post(`${baseUrl}/api/inbox/send-template`, {
        phone: p.phone,
        templateName: 'ai_assistant',
        language: 'en',
        variables: [{ key: '1', value: 'Lakshmi Raj Singh' }]
      }, { headers });
      console.log(`[SUCCESS ${p.phone}]:`, sendRes.data);
    } catch (e) {
      console.error(`[FAILED ${p.phone}]:`, e.response?.status, e.response?.data || e.message);
    }
  }

  await mongoose.disconnect();
}

deepTraceCampaignSend();
