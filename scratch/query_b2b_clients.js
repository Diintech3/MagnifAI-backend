const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkB2BClients() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;

  if (!baseUrl || !partnerSecret) {
    console.error('Config missing in .env');
    return;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/partner/clients`;
  console.log('Fetching clients from B2B server:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'x-partner-secret': partnerSecret,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== CLIENTS ON B2B SERVER ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching clients:', error.response?.data || error.message);
  }
}

checkB2BClients();
