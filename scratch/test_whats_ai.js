const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Read from target backend environment file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testAuth = async () => {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || 'whatsai-core-master-secret-key-2026';

  console.log('Testing connection to:', apiBaseUrl);
  console.log('Using credentials:');
  console.log('partnerKey:', partnerKey);
  console.log('clientToken:', clientToken);
  console.log('ref:', ref);

  try {
    const response = await axios.post(
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
    console.log('SUCCESS! Token received:', response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.log('FAILED! Error response:', errorMsg);
  }
};

testAuth();
