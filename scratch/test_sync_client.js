const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testSyncClient = async () => {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

  console.log('Testing sync-client against:', apiBaseUrl);
  console.log('Using partnerKey:', partnerKey);

  try {
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, '')}/api/partner/sync-client`,
      {
        name: 'Test Client ' + Date.now(),
        email: 'testclient' + Date.now() + '@example.com',
        phone: '917777777777',
        businessName: 'Test Business'
      },
      {
        headers: {
          'x-partner-key': partnerKey,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('SYNC SUCCESS! Response data:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.log('SYNC FAILED! Error response:', errorMsg);
  }
};

testSyncClient();
