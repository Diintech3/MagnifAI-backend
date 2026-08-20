const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkB2BCampaigns() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;
  const clientId = '6a849e6b76ad86128b626c9f'; // Lakshmi Raj Singh

  if (!baseUrl || !partnerSecret) {
    console.error('Config missing in .env');
    return;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/partner/clients/${clientId}/campaigns`;
  console.log('Fetching campaigns from B2B server:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'x-partner-secret': partnerSecret,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== RESPONSE FROM B2B SERVER ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching campaigns:', error.response?.data || error.message);
  }
}

checkB2BCampaigns();
