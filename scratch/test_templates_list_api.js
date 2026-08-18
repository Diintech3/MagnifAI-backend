const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testTemplatesListApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  console.log('Testing GET http://localhost:4000/api/app/whatsapp/templates/list ...');
  const res = await axios.get('http://localhost:4000/api/app/whatsapp/templates/list', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Response structure:', Object.keys(res.data));
  console.log('Response data:', JSON.stringify(res.data, null, 2));

  await mongoose.disconnect();
}

testTemplatesListApi();
