const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testDeleteSubUser() {
  const baseUrl = 'https://vectorize.diintech.com';
  const token = 'clt-ebcf4bafceaa8c1eb7b01f1c52a1e42ba66938ff6d944c8b';
  
  // Let's test deleting a dummy client or diintechteam9@gmail.com if it exists
  const clientIdToDelete = '6a50aa61d8100f1084348d78'; // ClientID for diintechteam9@gmail.com from WhatsAI DB

  console.log('Testing sub-user delete API on RAG server...');
  
  const endpoints = [
    `/api/clients/sub-users/${clientIdToDelete}`,
    `/api/clients/${clientIdToDelete}`,
    `/api/clients/sub-users?email=diintechteam9@gmail.com`
  ];

  for (const ep of endpoints) {
    console.log(`\nTrying DELETE on: ${baseUrl}${ep}...`);
    try {
      const res = await axios.delete(`${baseUrl}${ep}`, {
        headers: {
          'X-App-Token': token
        }
      });
      console.log('Success! Status:', res.status);
      console.log('Response:', res.data);
    } catch (e) {
      console.log('Failed. Status:', e.response?.status);
      console.log('Response:', e.response?.data || e.message);
    }
  }
}

testDeleteSubUser();
