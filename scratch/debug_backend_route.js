const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function debugBackendRoute() {
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
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };

  const payload = {
    name: 'raj 2',
    phone: '916388633422',
    group: ['6a84280171b4482bec548324'] // personal group ID on Whats AI
  };

  try {
    const createRes = await axios.post(`${baseUrl}/api/contacts`, payload, { headers });
    console.log('Create result:', createRes.data);
  } catch (createErr) {
    console.log('Create error caught:', createErr.response ? createErr.response.data : createErr.message);
    try {
      const listC = await axios.get(`${baseUrl}/api/contacts`, { headers });
      console.log('List Contacts response keys:', Object.keys(listC.data));
      const contactsList = listC.data?.data?.contacts || listC.data?.contacts || [];
      console.log('Contacts list count:', contactsList.length);
      contactsList.forEach(c => console.log('  -', c._id, c.name, c.phone));
      
      const cleanPhone = payload.phone;
      const existing = contactsList.find(c => {
        const p = (c.phone || "").replace(/[^0-9]/g, "");
        return p === cleanPhone || (cleanPhone.length >= 10 && p.endsWith(cleanPhone.slice(-10)));
      });
      console.log('Matched existing:', existing ? existing._id : 'NOT MATCHED');

      if (existing) {
        const currentGroups = Array.isArray(existing.group) ? existing.group.map(g => g._id || g) : [];
        const updatedGroups = Array.from(new Set([...currentGroups, ...payload.group]));
        const patchRes = await axios.patch(
          `${baseUrl}/api/contacts/${existing._id}`,
          { group: updatedGroups },
          { headers }
        );
        console.log('PATCH Result:', patchRes.data);
      }
    } catch (fallbackErr) {
      console.log('Fallback Err:', fallbackErr.response ? fallbackErr.response.data : fallbackErr.message);
    }
  }

  await mongoose.disconnect();
}

debugBackendRoute();
