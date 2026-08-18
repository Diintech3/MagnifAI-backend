const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testSingleCall() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

    const token = jwt.sign(
      { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '1d' }
    );

    const r = await axios.get('http://127.0.0.1:4000/api/app/whatsapp/templates', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET /templates SUCCESS:', r.status, 'Templates count:', r.data?.data?.templates?.length || r.data?.templates?.length);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
}

testSingleCall();
