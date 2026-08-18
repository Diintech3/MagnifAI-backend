const axios = require('axios');

async function testWithGroupId() {
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

  const groupId = "6a840a36074e3be72ece7ced";
  console.log(`Creating contact with group ObjectId: ${groupId}...`);
  const contactRes = await axios.post(`${baseUrl}/api/contacts`, {
    name: 'Rahul Verma',
    phone: '919876543210',
    email: 'rahul@example.com',
    group: [groupId],
    tags: ['Lead']
  }, { headers });

  console.log('Create Contact Result:', JSON.stringify(contactRes.data, null, 2));

  console.log('\nChecking Group Contact Count:');
  const listG = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('List Groups:', JSON.stringify(listG.data, null, 2));
}

testWithGroupId();
