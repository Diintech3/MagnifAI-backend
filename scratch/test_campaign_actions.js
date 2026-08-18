const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function testCampaignRoutes() {
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
    Authorization: `Bearer ${token}`,
    'x-api-key': partnerKey,
    'x-client-id': ceo.whatsAppClientId,
    'Content-Type': 'application/json'
  };

  // Get the most recent campaign
  const cList = await axios.get(`${baseUrl}/api/campaigns`, { headers });
  const recent = cList.data?.data?.campaigns?.[0];
  console.log('Most recent campaign:', recent ? { id: recent._id, name: recent.name, status: recent.status } : 'none');

  if (recent) {
    const cid = recent._id;
    const routesToTest = [
      { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/send` },
      { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/start` },
      { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/trigger` },
      { method: 'post', url: `${baseUrl}/api/campaigns/${cid}/launch` },
      { method: 'post', url: `${baseUrl}/api/campaigns/send/${cid}` },
      { method: 'patch', url: `${baseUrl}/api/campaigns/${cid}`, body: { status: 'active' } },
      { method: 'get', url: `${baseUrl}/api/campaigns/${cid}` }
    ];

    for (const r of routesToTest) {
      try {
        const res = await axios({
          method: r.method,
          url: r.url,
          data: r.body || {},
          headers
        });
        console.log(`[SUCCESS] ${r.method.toUpperCase()} ${r.url}:`, res.data);
      } catch (e) {
        console.log(`[FAILED] ${r.method.toUpperCase()} ${r.url}:`, e.response?.status, e.response ? e.response.data : e.message);
      }
    }
  }

  await mongoose.disconnect();
}

testCampaignRoutes();
