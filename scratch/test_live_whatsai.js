const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testLiveTemplates = async () => {
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
    console.log('Login successful.');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'Content-Type': 'application/json',
      'x-client-id': clientId
    };

    console.log(`\n--- Fetching live templates with x-client-id: ${clientId} ---`);
    const templatesRes = await axios.get(
      `${apiBaseUrl.replace(/\/$/, '')}/api/templates`,
      { headers }
    );
    console.log('Status:', templatesRes.status);
    console.log('Response:', JSON.stringify(templatesRes.data, null, 2));

  } catch (err) {
    console.error('Error occurred:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
};

testLiveTemplates();
