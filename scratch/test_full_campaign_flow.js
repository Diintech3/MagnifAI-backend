const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testFullCampaignCreateAndSend() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  // 1. Get Groups
  const gRes = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groups = gRes.data?.data?.groups || gRes.data || [];
  const targetGroup = groups.find(g => g.name.toLowerCase() === 'akkash');

  // 2. Get Templates
  const tRes = await axios.get('http://localhost:4000/api/app/whatsapp/templates/list', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const templates = tRes.data?.data?.templates || [];
  const targetTemplate = templates.find(t => t.status === 'APPROVED');

  console.log('Using Group:', targetGroup?.name, targetGroup?.id || targetGroup?._id);
  console.log('Using Template:', targetTemplate?.name, targetTemplate?.id || targetTemplate?._id);

  // 3. Create Campaign
  console.log('\nTesting POST http://localhost:4000/api/app/whatsapp/campaigns ...');
  const createRes = await axios.post('http://localhost:4000/api/app/whatsapp/campaigns', {
    name: 'Live Verified Test Campaign ' + Date.now(),
    templateId: targetTemplate?.id || targetTemplate?._id,
    groupId: targetGroup?.id || targetGroup?._id,
    variablesMapping: { '1': 'Lakshmi Raj Singh' }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Create Campaign Response:', createRes.data);
  const campaignId = createRes.data?.campaignId || createRes.data?._id || createRes.data?.data?.campaignId;
  console.log('Created Campaign ID:', campaignId);

  // 4. Send Broadcast
  if (campaignId) {
    console.log(`\nTesting POST http://localhost:4000/api/app/whatsapp/campaigns/${campaignId}/send ...`);
    const sendRes = await axios.post(`http://localhost:4000/api/app/whatsapp/campaigns/${campaignId}/send`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Send Broadcast Response:', sendRes.data);
  }

  await mongoose.disconnect();
}

testFullCampaignCreateAndSend();
