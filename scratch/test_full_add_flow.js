const axios = require('axios');

async function testFullAddFlow() {
  const baseUrl = 'https://w-a-backend.onrender.com';
  const partnerKey = 'wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b';
  const clientToken = 'wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0';
  const ref = 'wa_ref_5079ca47a979a4c5aefa228c9834bd4e';
  const apiKey = 'whatsai-core-master-secret-key-2026';

  const loginRes = await axios.post(`${baseUrl}/api/auth/api-sharing-login`, {
    apiSharingKey: partnerKey,
    accessToken: clientToken,
    referenceKey: ref
  }, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  const token = loginRes.data.data.accessToken;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-api-key': partnerKey,
    'Content-Type': 'application/json'
  };

  // 1. Get live groups
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  const liveGroups = gRes.data?.data?.groups || [];
  const ashi = liveGroups.find(g => g.name.toLowerCase() === 'ashi');
  console.log('Target Group ashi:', ashi._id);

  // 2. Try to add "raj 2" (+916388633422) to ashi group
  const phone = '916388633422';
  const name = 'raj 2';
  const groupIds = [ashi._id];

  let result;
  try {
    const postRes = await axios.post(`${baseUrl}/api/contacts`, {
      name,
      phone,
      group: groupIds,
      tags: ['Lead']
    }, { headers });
    if (postRes.data && postRes.data.success !== false) {
      result = postRes.data;
    } else {
      throw new Error(postRes.data?.message || 'Create failed');
    }
  } catch (err) {
    console.log('Initial POST returned:', err.response ? err.response.data : err.message);
    console.log('Triggering PATCH fallback...');
    const listC = await axios.get(`${baseUrl}/api/contacts`, { headers });
    const contactsList = listC.data?.data?.contacts || listC.data?.contacts || [];
    const existing = contactsList.find(c => {
      const p = (c.phone || '').replace(/[^0-9]/g, '');
      return p === phone || (phone.length >= 10 && p.endsWith(phone.slice(-10)));
    });

    if (existing) {
      const currentGroups = Array.isArray(existing.group) ? existing.group.map(g => g._id || g) : [];
      const updatedGroups = Array.from(new Set([...currentGroups, ...groupIds]));
      const patchRes = await axios.patch(`${baseUrl}/api/contacts/${existing._id}`, {
        group: updatedGroups
      }, { headers });
      result = patchRes.data;
    } else {
      throw err;
    }
  }

  console.log('Final Result:', result);

  // Verify group count
  const gFinal = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Updated Groups:', gFinal.data?.data?.groups?.map(g => ({ name: g.name, count: g.contactCount })));
}

testFullAddFlow();
