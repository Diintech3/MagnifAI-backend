const axios = require('axios');

async function testLiveContactsAndGroups() {
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

  console.log('1. Testing GET /api/contacts/groups...');
  try {
    const groupsRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
    console.log('Groups Response:', JSON.stringify(groupsRes.data, null, 2));
  } catch (e) {
    console.error('Groups Error:', e.response ? e.response.data : e.message);
  }

  console.log('\n2. Testing GET /api/contacts...');
  try {
    const contactsRes = await axios.get(`${baseUrl}/api/contacts`, { headers });
    console.log('Contacts Response Status:', contactsRes.status);
    console.log('Contacts Data Count:', contactsRes.data?.data?.contacts?.length || contactsRes.data?.contacts?.length || 0);
  } catch (e) {
    console.error('Contacts Error:', e.response ? e.response.data : e.message);
  }
}

testLiveContactsAndGroups();
