const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const clientIds = [
  '6a78250174d61f27cc08d491',
  '6a82a945107e72ed69cddd75',
  '6a849e6b76ad86128b626c9f',
  '6a86b3f6e55d24024adc3b91'
];

async function checkAllCampaigns() {
  const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
  const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;

  for (let clientId of clientIds) {
    const url = `${baseUrl.replace(/\/$/, '')}/partner/clients/${clientId}/campaigns`;
    try {
      const res = await axios.get(url, {
        headers: { 'x-partner-secret': partnerSecret, 'Content-Type': 'application/json' }
      });
      console.log(`\n=== CAMPAIGNS FOR CLIENT ${clientId} ===`);
      console.log(JSON.stringify(res.data.data, null, 2));
    } catch (e) {
      console.log(`Failed for client ${clientId}:`, e.message);
    }
  }
}

checkAllCampaigns();
