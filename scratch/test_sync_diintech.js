const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testSyncDiintech() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;

  const emails = ['diintechteam07@gmail.com', 'diintechteam7@gmail.com'];

  for (const email of emails) {
    console.log(`\nTesting sync-client on AdplifAI for email: ${email}...`);
    try {
      const res = await axios.post(`${baseUrl.replace(/\/$/, '')}/partner/sync-client`, {
        name: 'Diintech',
        email: email,
        phone: '9876543210',
        businessName: 'diin technologies'
      }, {
        headers: {
          'x-partner-secret': partnerSecret,
          'Content-Type': 'application/json'
        }
      });

      console.log('Status:', res.status);
      console.log('Response:', res.data);
    } catch (e) {
      console.error('Error Status:', e.response?.status);
      console.error('Error Data:', e.response?.data || e.message);
    }
  }
}

testSyncDiintech();
