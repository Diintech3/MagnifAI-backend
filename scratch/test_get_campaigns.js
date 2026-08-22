const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testGetCampaigns() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;
  
  // Use the API key assigned to CEO diintechteam07@gmail.com in the database
  const clientApiKey = 'diin_51262d2d8d6d4d3180971e80992059e8';

  console.log('Fetching campaigns from external server...');
  try {
    const res = await axios.get(`${baseUrl.replace(/\/$/, '')}/partner/campaigns`, {
      headers: {
        'x-partner-secret': partnerSecret,
        'x-api-key': clientApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', res.status);
    console.log('Campaigns:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Error Status:', e.response?.status);
    console.error('Error Data:', e.response?.data || e.message);
  }
}

testGetCampaigns();
