const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkWhatsAiData = async () => {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || 'whatsai-core-master-secret-key-2026';

  try {
    // 1. Get JWT token
    console.log('Logging in to WhatsAI API sharing...');
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
    console.log('Login successful. Token acquired.');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-api-key': partnerKey,
      'Content-Type': 'application/json'
    };

    // 2. Fetch conversations
    console.log('\n--- Fetching Conversations ---');
    try {
      const convsRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, '')}/api/inbox/conversations`,
        { headers }
      );
      console.log('Conversations Status:', convsRes.status);
      console.log('Conversations Data:', JSON.stringify(convsRes.data, null, 2));
    } catch (e) {
      console.error('Failed to fetch conversations:', e.response ? JSON.stringify(e.response.data) : e.message);
    }

    // 3. Fetch campaigns
    console.log('\n--- Fetching Campaigns ---');
    try {
      const campaignsRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, '')}/api/campaigns`,
        { headers }
      );
      console.log('Campaigns Status:', campaignsRes.status);
      console.log('Campaigns Data:', JSON.stringify(campaignsRes.data, null, 2));
    } catch (e) {
      console.error('Failed to fetch campaigns:', e.response ? JSON.stringify(e.response.data) : e.message);
    }

  } catch (err) {
    console.error('Auth / general error:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
};

checkWhatsAiData();
