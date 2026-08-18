const axios = require('axios');

async function testWhatsAi() {
  const baseUrl = 'https://w-a-backend.onrender.com';
  const partnerKey = 'wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b';
  const clientToken = 'wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0';
  const ref = 'wa_ref_5079ca47a979a4c5aefa228c9834bd4e';
  const apiKey = 'whatsai-core-master-secret-key-2026';

  console.log('Testing Handshake login...');
  try {
    const res = await axios.post(`${baseUrl}/api/auth/api-sharing-login`, {
      apiSharingKey: partnerKey,
      accessToken: clientToken,
      referenceKey: ref
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log('Handshake Success! Response:', res.data);
    const token = res.data.token || res.data.data?.token || res.data.data?.accessToken;
    console.log('Got JWT Token:', token ? 'YES' : 'NO');

    if (token) {
      console.log('\nTesting GET /api/contacts with JWT + x-api-key: apiKey...');
      const contactsRes1 = await axios.get(`${baseUrl}/api/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': apiKey
        }
      });
      console.log('Contacts (with apiKey): status =', contactsRes1.status, 'data length =', contactsRes1.data?.contacts?.length || contactsRes1.data?.data?.length);

      console.log('\nTesting GET /api/contacts with JWT + x-api-key: partnerKey (current code way)...');
      try {
        const contactsRes2 = await axios.get(`${baseUrl}/api/contacts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-api-key': partnerKey
          }
        });
        console.log('Contacts (with partnerKey as x-api-key): status =', contactsRes2.status);
      } catch (e) {
        console.log('Contacts with partnerKey failed:', e.response?.status, e.response?.data);
      }
    }
  } catch (err) {
    console.error('Handshake failed:', err.response?.status, err.response?.data || err.message);
  }
}

testWhatsAi();
