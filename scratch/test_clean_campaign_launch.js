const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCleanCampaignLaunch() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  const gRes = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groups = gRes.data?.data?.groups || gRes.data || [];
  const targetGroup = groups.find(g => g.name.toLowerCase() === 'akkash');

  const tRes = await axios.get('http://localhost:4000/api/app/whatsapp/templates/list', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const templates = tRes.data?.data?.templates || [];
  const targetTemplate = templates.find(t => t.status === 'APPROVED');

  console.log('Testing campaign launch on http://localhost:4000 ...');
  const createRes = await axios.post('http://localhost:4000/api/app/whatsapp/campaigns', {
    name: 'akkash broadcast test',
    templateId: targetTemplate?.id || targetTemplate?._id,
    groupId: targetGroup?.id || targetGroup?._id,
    variablesMapping: { '1': 'Lakshmi Raj Singh' }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Create Campaign Result:', createRes.data);

  // Verify it appears in the campaigns list
  const cListRes = await axios.get('http://localhost:4000/api/app/whatsapp/campaigns', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const allCampaigns = cListRes.data?.data?.campaigns || [];
  console.log(`Total campaigns now on Whats AI: ${allCampaigns.length}`);
  console.log('Latest campaign:', allCampaigns[0]?.name);

  await mongoose.disconnect();
}

testCleanCampaignLaunch();
