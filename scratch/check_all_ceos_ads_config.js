const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkCeos() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { CEO } = require('../src/models/CEO');
  const ceos = await CEO.find({}).lean();
  console.log('\n=== ALL CEOS IN LOCAL DB ===');
  ceos.forEach(c => {
    console.log(`- ID: ${c._id}, Name: ${c.name}, Email: ${c.email}, adplifAiClientId: ${c.adplifAiClientId || 'NONE'}, adplifAiApiKey: ${c.adplifAiApiKey || 'NONE'}`);
  });

  await mongoose.disconnect();
}

checkCeos();
