const axios = require('axios');

async function testHeaders() {
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
  console.log('Login successful! Access token obtained.');

  // Test 1: with Authorization Bearer + x-api-key: partnerKey
  try {
    const res1 = await axios.get(`${baseUrl}/api/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': partnerKey
      }
    });
    console.log('Test 1 (Bearer + x-api-key=partnerKey): SUCCESS', res1.status, res1.data);
  } catch (e) {
    console.log('Test 1 Failed:', e.response?.status, e.response?.data);
  }

  // Test 2: with only Authorization Bearer
  try {
    const res2 = await axios.get(`${baseUrl}/api/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Test 2 (Bearer only): SUCCESS', res2.status, res2.data);
  } catch (e) {
    console.log('Test 2 Failed:', e.response?.status, e.response?.data);
  }

  // Test 3: with Authorization Bearer + x-partner-key: partnerKey
  try {
    const res3 = await axios.get(`${baseUrl}/api/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-partner-key': partnerKey
      }
    });
    console.log('Test 3 (Bearer + x-partner-key=partnerKey): SUCCESS', res3.status, res3.data);
  } catch (e) {
    console.log('Test 3 Failed:', e.response?.status, e.response?.data);
  }

  // Test 4: Check /api/whatsapp/connect vs /api/settings/waba
  try {
    const res4 = await axios.post(`${baseUrl}/api/whatsapp/connect`, {
      whatsappPhoneNumberId: 'test_phone',
      whatsappAccessToken: 'test_token',
      whatsappWabaId: 'test_waba'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': partnerKey
      }
    });
    console.log('Test 4 (/api/whatsapp/connect): SUCCESS', res4.status, res4.data);
  } catch (e) {
    console.log('Test 4 (/api/whatsapp/connect) Response:', e.response?.status, e.response?.data);
  }
}

testHeaders();
