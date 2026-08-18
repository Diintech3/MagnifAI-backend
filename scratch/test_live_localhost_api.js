const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Group } = require('../src/models/Group');

async function testLiveApiFromLocalhost() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email, appId: ceo.appId?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/whatsapp/groups ...');
  try {
    const gRes = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Groups Response:', gRes.data?.groups?.map(g => ({ name: g.name, id: g._id || g.id, count: g.contactCount })));
  } catch (err) {
    console.log('GET Groups Error:', err.response ? err.response.data : err.message);
  }

  console.log('\nTesting POST http://localhost:4000/api/app/whatsapp/contacts (Adding "raj 2" to "personal")...');
  try {
    const postRes = await axios.post('http://localhost:4000/api/app/whatsapp/contacts', {
      name: 'raj 2',
      phone: '916388633422',
      groups: ['personal']
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('POST Result:', postRes.data);
  } catch (err) {
    console.log('POST Contacts Error:', err.response ? err.response.data : err.message);
  }

  console.log('\nTesting Final Groups Count...');
  const gResFinal = await axios.get('http://localhost:4000/api/app/whatsapp/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Final Live Groups:', gResFinal.data?.groups?.map(g => ({ name: g.name, count: g.contactCount })));

  await mongoose.disconnect();
}

testLiveApiFromLocalhost();
