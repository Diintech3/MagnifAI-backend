const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testGroupEndpoints() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/whatsapp/groups ...');
  const gListRes = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groups = gListRes.data?.data?.groups || gListRes.data || [];
  console.log('Groups fetched:', groups.map(g => ({ name: g.name, id: g._id || g.id, count: g.contactCount })));

  const personalGroup = groups.find(g => g.name.toLowerCase() === 'personal');
  if (personalGroup) {
    const pId = personalGroup._id || personalGroup.id;
    console.log(`\nTesting GET http://localhost:4000/api/app/whatsapp/groups/${pId}/members ...`);
    const mRes = await axios.get(`http://localhost:4000/api/app/whatsapp/groups/${pId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Members response:', {
      success: mRes.data.success,
      group: mRes.data.group,
      memberCount: mRes.data.members?.length,
      memberPhones: mRes.data.memberPhones,
      membersList: mRes.data.members?.map(m => `${m.name} (${m.phone})`)
    });
  }

  await mongoose.disconnect();
}

testGroupEndpoints();
