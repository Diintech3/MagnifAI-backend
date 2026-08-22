const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testGetClientCampaigns() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;
  
  const clientIds = [
    '6a86b3f6e55d24024adc3b91', // diintechteam7@gmail.com (currently saved on active CEO)
    '6a8936b167dae4f0039beaf5'  // diintechteam07@gmail.com (correct one for active CEO email)
  ];

  for (const clientId of clientIds) {
    console.log(`\nFetching campaigns from external server for client: ${clientId}...`);
    try {
      const res = await axios.get(`${baseUrl.replace(/\/$/, '')}/partner/clients/${clientId}/campaigns`, {
        headers: {
          'x-partner-secret': partnerSecret,
          'Content-Type': 'application/json'
        }
      });

      console.log('Status:', res.status);
      console.log('Campaigns Count:', Array.isArray(res.data?.data) ? res.data.data.length : 'Not an array');
      console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Error Status:', e.response?.status);
      console.error('Error Data:', e.response?.data || e.message);
    }
  }
}

testGetClientCampaigns();
