const axios = require('axios');

async function testSaveAiAgent() {
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

  console.log('Sending agentId 1dab63dc5e1d37a2 to Whats AI /api/settings/ai-agent...');
  const saveRes = await axios.post(`${baseUrl}/api/settings/ai-agent`, {
    agentId: '1dab63dc5e1d37a2'
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'Content-Type': 'application/json'
    }
  });

  console.log('Save AI Agent Response:', JSON.stringify(saveRes.data, null, 2));

  console.log('\nVerifying GET /api/settings/ai-agent...');
  const getRes = await axios.get(`${baseUrl}/api/settings/ai-agent`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey
    }
  });
  console.log('Get AI Agent Response:', JSON.stringify(getRes.data, null, 2));
}

testSaveAiAgent();
