const axios = require('axios');

async function inspectClient() {
  const baseUrl = 'https://w-a-backend.onrender.com';
  const partnerKey = 'wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b';
  const clientToken = 'wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0';
  const ref = 'wa_ref_5079ca47a979a4c5aefa228c9834bd4e';
  const apiKey = 'whatsai-core-master-secret-key-2026';

  console.log('1. Checking client-status for singhlakshmiraj@gmail.com...');
  try {
    const res = await axios.get(`${baseUrl}/api/partner/client-status?email=singhlakshmiraj@gmail.com`, {
      headers: { 'x-partner-key': partnerKey }
    });
    console.log('Client Status Response:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log('client-status failed:', e.response?.status, e.response?.data || e.message);
  }

  console.log('\n2. Syncing client singhlakshmiraj@gmail.com...');
  try {
    const res2 = await axios.post(`${baseUrl}/api/partner/sync-client`, {
      name: 'Lakshami Raj Singh',
      email: 'singhlakshmiraj@gmail.com',
      phone: '919898989898',
      businessName: 'Agency'
    }, {
      headers: { 'x-partner-key': partnerKey, 'Content-Type': 'application/json' }
    });
    console.log('Sync Client Response:', JSON.stringify(res2.data, null, 2));
  } catch (e) {
    console.log('sync-client failed:', e.response?.status, e.response?.data || e.message);
  }

  console.log('\n3. Logging in & checking AI Agent settings on Whats AI...');
  const loginRes = await axios.post(`${baseUrl}/api/auth/api-sharing-login`, {
    apiSharingKey: partnerKey,
    accessToken: clientToken,
    referenceKey: ref
  }, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  const token = loginRes.data.data.accessToken;

  try {
    const aiRes = await axios.get(`${baseUrl}/api/settings/ai-agent`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': partnerKey
      }
    });
    console.log('AI Agent Response from Whats AI:', JSON.stringify(aiRes.data, null, 2));
  } catch (e) {
    console.log('GET AI Agent failed:', e.response?.status, e.response?.data || e.message);
  }
}

inspectClient();
