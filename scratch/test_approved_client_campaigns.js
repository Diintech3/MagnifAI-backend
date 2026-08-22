const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testGetClientCampaigns() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL || 'https://ai-marketing-backend-nmoc.onrender.com/api/v1/external';
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;
  
  const clientId = '6a78250174d61f27cc08d491'; // The approved client ID for diintech07@gmail.com

  console.log(`Fetching campaigns for approved client ID: ${clientId}...`);
  try {
    const res = await axios.get(`${baseUrl.replace(/\/$/, '')}/partner/clients/${clientId}/campaigns`, {
      headers: {
        'x-partner-secret': partnerSecret,
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

testGetClientCampaigns();
