const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function auditAllPromoteApis() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const token = jwt.sign(
    { sub: ceo._id.toString(), role: 'CEO', email: ceo.email },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  const base = 'http://localhost:4000';
  const headers = { Authorization: `Bearer ${token}` };

  console.log('=== AUDITING ALL PROMOTE WHATSAPP APIS ===\n');

  const tests = [
    { name: '1. GET /api/app/whatsapp/config', method: 'GET', url: `${base}/api/app/whatsapp/config` },
    { name: '2. GET /api/app/whatsapp/sso-link', method: 'GET', url: `${base}/api/app/whatsapp/sso-link` },
    { name: '3. GET /api/app/whatsapp/templates', method: 'GET', url: `${base}/api/app/whatsapp/templates` },
    { name: '4. GET /api/app/whatsapp/templates/list', method: 'GET', url: `${base}/api/app/whatsapp/templates/list` },
    { name: '5. GET /api/app/whatsapp/groups', method: 'GET', url: `${base}/api/app/whatsapp/groups` },
    { name: '6. GET /api/app/whatsapp/groups/6a82d07424d0dbb08e022ac7/members', method: 'GET', url: `${base}/api/app/whatsapp/groups/6a82d07424d0dbb08e022ac7/members` },
    { name: '7. GET /api/app/whatsapp/campaigns', method: 'GET', url: `${base}/api/app/whatsapp/campaigns` },
    { name: '8. GET /api/app/whatsapp/conversations', method: 'GET', url: `${base}/api/app/whatsapp/conversations` },
    { name: '9. GET /api/app/whatsapp/conversations/6a6728e40686214cf0fc6a43/messages', method: 'GET', url: `${base}/api/app/whatsapp/conversations/6a6728e40686214cf0fc6a43/messages` },
  ];

  for (const t of tests) {
    try {
      const res = await axios({ method: t.method, url: t.url, headers });
      console.log(`✅ [${res.status}] ${t.name}`);
    } catch (e) {
      console.log(`❌ [${e.response?.status || 'ERR'}] ${t.name} ->`, e.response?.data || e.message);
    }
  }

  await mongoose.disconnect();
}

auditAllPromoteApis();
