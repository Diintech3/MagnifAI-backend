const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkCampaignFields = async () => {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || 'whatsai-core-master-secret-key-2026';

  const clientId = "6a66f2c106372d3b8ea6b902"; // Lakshami Raj Singh

  try {
    console.log('Logging in to WhatsAI...');
    const loginRes = await axios.post(
      `${apiBaseUrl.replace(/\/$/, '')}/api/auth/api-sharing-login`,
      {
        apiSharingKey: partnerKey,
        accessToken: clientToken,
        referenceKey: ref
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const token = loginRes.data.data.token || loginRes.data.data.accessToken || loginRes.data.token || loginRes.data.accessToken;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'Content-Type': 'application/json',
      'x-client-id': clientId
    };

    console.log(`\n--- Fetching live campaigns ---`);
    const campaignsRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, '')}/api/campaigns`,
      { headers }
    );

    const firstCampaign = campaignsRes.data?.data?.campaigns?.[0] || campaignsRes.data?.[0];
    console.log('First Campaign Structure:');
    console.log(JSON.stringify(firstCampaign, null, 2));

  } catch (err) {
    console.error('Error occurred:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
};

checkCampaignFields();
