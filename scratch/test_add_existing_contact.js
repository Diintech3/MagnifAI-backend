const axios = require('axios');

async function testAddExistingContactToGroup() {
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

  // 1. Get all groups on Whats AI
  const gRes = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('Groups on Whats AI:', gRes.data?.data?.groups);

  // 2. Try to add "raj 2" (phone: 916388633422) to group "ashi"
  const ashiGroup = gRes.data?.data?.groups?.find(g => g.name.toLowerCase() === 'ashi') || gRes.data?.data?.groups?.[0];
  console.log('Target Group:', ashiGroup);

  console.log('\nTesting POST /api/contacts for existing phone 916388633422...');
  try {
    const postRes = await axios.post(`${baseUrl}/api/contacts`, {
      name: 'raj 2',
      phone: '916388633422',
      group: [ashiGroup._id]
    }, { headers });
    console.log('POST Result:', postRes.data);
  } catch (e) {
    console.log('POST Failed with:', e.response ? e.response.data : e.message);
  }

  // 3. List all contacts on Whats AI to find contact by phone
  console.log('\nListing all contacts on Whats AI...');
  const listC = await axios.get(`${baseUrl}/api/contacts`, { headers });
  const contactsList = listC.data?.data?.contacts || listC.data?.contacts || [];
  console.log(`Found ${contactsList.length} contacts on Whats AI:`);
  contactsList.forEach(c => console.log(`  - ID: ${c._id}, Name: ${c.name}, Phone: ${c.phone}, Groups:`, c.group));

  const existingContact = contactsList.find(c => c.phone === '916388633422' || c.phone.endsWith('6388633422'));
  if (existingContact) {
    console.log(`\nFound existing contact ${existingContact._id}, updating group with PATCH /api/contacts/${existingContact._id}...`);
    try {
      const currentGroups = Array.isArray(existingContact.group) ? existingContact.group.map(g => g._id || g) : [];
      const updatedGroups = Array.from(new Set([...currentGroups, ashiGroup._id]));
      const patchRes = await axios.patch(`${baseUrl}/api/contacts/${existingContact._id}`, {
        group: updatedGroups
      }, { headers });
      console.log('PATCH Result:', patchRes.data);
    } catch (e) {
      console.log('PATCH Failed with:', e.response ? e.response.data : e.message);
    }
  }

  // 4. Verify group counts again
  const gResFinal = await axios.get(`${baseUrl}/api/contacts/groups`, { headers });
  console.log('\nFinal Groups on Whats AI:', gResFinal.data?.data?.groups);
}

testAddExistingContactToGroup();
