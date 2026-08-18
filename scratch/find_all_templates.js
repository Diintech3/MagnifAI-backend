const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function findLakshmiRajTemplates() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO details:', {
    email: ceo.email,
    name: ceo.name,
    whatsAppClientId: ceo.whatsAppClientId,
    whatsAppPhoneNumberId: ceo.whatsAppPhoneNumberId,
    whatsAppWabaId: ceo.whatsAppWabaId
  });

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

  // Try 1: GET /api/templates without client header
  console.log('\n--- 1. GET /api/templates (partner token) ---');
  try {
    const r1 = await axios.get(`${baseUrl}/api/templates`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey }
    });
    console.log('Count:', r1.data?.data?.templates?.length, r1.data?.data?.templates?.map(t => t.name));
  } catch (e) {
    console.log('Error 1:', e.message);
  }

  // Try 2: GET /api/templates with x-client-id
  console.log('\n--- 2. GET /api/templates (with x-client-id) ---');
  try {
    const r2 = await axios.get(`${baseUrl}/api/templates`, {
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': partnerKey, 'x-client-id': ceo.whatsAppClientId }
    });
    console.log('Count:', r2.data?.data?.templates?.length, r2.data?.data?.templates?.map(t => t.name));
  } catch (e) {
    console.log('Error 2:', e.response ? e.response.data : e.message);
  }

  // Try 3: GET /api/partner/templates
  console.log('\n--- 3. GET /api/partner/templates ---');
  try {
    const r3 = await axios.get(`${baseUrl}/api/partner/templates`, {
      headers: { 'x-partner-key': partnerKey }
    });
    console.log('Partner templates count:', r3.data);
  } catch (e) {
    console.log('Error 3:', e.response ? e.response.data : e.message);
  }

  // Try 4: Check if there is another endpoint or client list
  console.log('\n--- 4. GET /api/partner/clients ---');
  try {
    const r4 = await axios.get(`${baseUrl}/api/partner/clients`, {
      headers: { 'x-partner-key': partnerKey }
    });
    console.log('Clients count:', r4.data?.data?.clients?.length, r4.data?.data?.clients?.map(c => ({ name: c.name, email: c.email, id: c._id })));
  } catch (e) {
    console.log('Error 4:', e.response ? e.response.data : e.message);
  }

  // Try 5: Check all templates in MongoDB / git history
  await mongoose.disconnect();
}

findLakshmiRajTemplates();
