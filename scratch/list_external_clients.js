const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function listExternalClients() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;

  console.log('Listing all clients from external AdplifAI server...');
  try {
    const res = await axios.get(`${baseUrl.replace(/\/$/, '')}/partner/clients`, {
      headers: {
        'x-partner-secret': partnerSecret,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', res.status);
    console.log('Total Clients:', res.data?.data?.length || 0);
    console.log('Clients Detail:');
    if (res.data && res.data.success && Array.isArray(res.data.data)) {
      res.data.data.forEach((c, idx) => {
        console.log(`- #${idx+1} ID: ${c.clientId} | Name: ${c.name} | Email: ${c.email} | Status: ${c.approvalStatus}`);
      });
    } else {
      console.log('Response:', JSON.stringify(res.data, null, 2));
    }
  } catch (e) {
    console.error('Error Status:', e.response?.status);
    console.error('Error Data:', e.response?.data || e.message);
  }
}

listExternalClients();
