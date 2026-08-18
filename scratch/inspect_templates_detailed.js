const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function inspectTemplatesOnWhatsAi() {
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

  // 1. Without x-client-id
  const headersWithout = {
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };

  console.log('=== TEMPLATES ON WHATS AI WITHOUT x-client-id ===');
  try {
    const res1 = await axios.get(`${baseUrl}/api/whatsapp/templates`, { headers: headersWithout });
    const list1 = res1.data?.data?.templates || res1.data?.templates || res1.data || [];
    console.log(`Count: ${list1.length}`);
    list1.forEach(t => console.log(`  - Name: "${t.name}", Status: "${t.status}", Category: "${t.category}"`));
  } catch (e) {
    console.log('Error without x-client-id:', e.response ? e.response.data : e.message);
  }

  // 2. With x-client-id
  if (ceo.whatsAppClientId) {
    console.log(`\n=== TEMPLATES ON WHATS AI WITH x-client-id (${ceo.whatsAppClientId}) ===`);
    const headersWith = {
      ...headersWithout,
      'x-client-id': ceo.whatsAppClientId
    };
    try {
      const res2 = await axios.get(`${baseUrl}/api/whatsapp/templates`, { headers: headersWith });
      const list2 = res2.data?.data?.templates || res2.data?.templates || res2.data || [];
      console.log(`Count: ${list2.length}`);
      list2.forEach(t => console.log(`  - Name: "${t.name}", Status: "${t.status}", Category: "${t.category}"`));
    } catch (e) {
      console.log('Error with x-client-id:', e.response ? e.response.data : e.message);
    }
  }

  // 3. Check what backend route /api/app/whatsapp/templates returns
  console.log('\n=== BACKEND /whatsapp/templates HANDLER CHECK ===');
  // Check in appPortal.js how router.get("/whatsapp/templates") is written
  await mongoose.disconnect();
}

inspectTemplatesOnWhatsAi();
