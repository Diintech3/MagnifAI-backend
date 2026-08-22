const axios = require('axios');

async function findAndDelete() {
  const token = 'clt-ebcf4bafceaa8c1eb7b01f1c52a1e42ba66938ff6d944c8b';
  const baseUrl = 'https://vectorize.diintech.com';

  console.log('Fetching sub-users list from RAG server...');
  try {
    const listRes = await axios.get(`${baseUrl}/api/clients/sub-users`, {
      headers: { 'X-App-Token': token }
    });

    if (listRes.data && listRes.data.success && Array.isArray(listRes.data.users)) {
      const targetUser = listRes.data.users.find(u => u.email.toLowerCase() === 'diintechteam9@gmail.com');
      if (targetUser) {
        console.log('Found user on RAG server:');
        console.log(`Email: ${targetUser.email}`);
        console.log(`RAG Client ID: ${targetUser.client_id}`);
        console.log(`Name: ${targetUser.name}`);

        console.log(`\nAttempting DELETE on /api/clients/sub-users/${targetUser.client_id}...`);
        const delRes = await axios.delete(`${baseUrl}/api/clients/sub-users/${targetUser.client_id}`, {
          headers: { 'X-App-Token': token }
        });
        console.log('Status:', delRes.status);
        console.log('Response:', delRes.data);
      } else {
        console.log('diintechteam9@gmail.com was not found in the RAG sub-users list.');
      }
    } else {
      console.log('Failed to fetch sub-users list:', listRes.data);
    }
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
  }
}

findAndDelete();
