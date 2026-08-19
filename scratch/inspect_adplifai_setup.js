const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function inspectAdplifAiSetup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  console.log('=== LAKSHMI RAJ SINGH ADPLIFAI DATA IN DB ===');
  console.log('CEO ID:', ceo._id);
  console.log('CEO Name:', ceo.name);
  console.log('adplifAiClientId:', ceo.adplifAiClientId);
  console.log('adplifAiApiKey:', ceo.adplifAiApiKey);

  console.log('\n=== ENVIRONMENT VARIABLES IN .ENV ===');
  console.log('ADPLIFAI_API_BASE_URL:', process.env.ADPLIFAI_API_BASE_URL);
  console.log('ADPLIFAI_PARTNER_SECRET:', process.env.ADPLIFAI_PARTNER_SECRET ? 'SET (length: ' + process.env.ADPLIFAI_PARTNER_SECRET.length + ')' : 'NOT SET');

  await mongoose.disconnect();
}

inspectAdplifAiSetup();
