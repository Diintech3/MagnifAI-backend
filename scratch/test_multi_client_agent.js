const axios = require('axios');

async function testMultiClientAiAgent() {
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

  // Client 1: Lakshmi Raj Singh (clientId: 6a66f2c106372d3b8ea6b902, agentId: 1dab63dc5e1d37a2)
  console.log('1. Setting AI Agent for Lakshmi Raj Singh (6a66f2c106372d3b8ea6b902)...');
  await axios.post(`${baseUrl}/api/settings/ai-agent`, { agentId: '1dab63dc5e1d37a2' }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'x-client-id': '6a66f2c106372d3b8ea6b902'
    }
  });

  // Client 2: Dhanveer Chauhan (clientId: 6a7d923a82a1b4879b6957e3, agentId: b4656d4c8699d83e)
  console.log('2. Setting AI Agent for Dhanveer Chauhan (6a7d923a82a1b4879b6957e3)...');
  await axios.post(`${baseUrl}/api/settings/ai-agent`, { agentId: 'b4656d4c8699d83e' }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'x-client-id': '6a7d923a82a1b4879b6957e3'
    }
  });

  // Now verify GET for Client 1
  const res1 = await axios.get(`${baseUrl}/api/settings/ai-agent`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'x-client-id': '6a66f2c106372d3b8ea6b902'
    }
  });
  console.log('Client 1 (Lakshmi Raj) GET AI Agent:', res1.data);

  // Verify GET for Client 2
  const res2 = await axios.get(`${baseUrl}/api/settings/ai-agent`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'x-client-id': '6a7d923a82a1b4879b6957e3'
    }
  });
  console.log('Client 2 (Dhanveer) GET AI Agent:', res2.data);
}

testMultiClientAiAgent();
