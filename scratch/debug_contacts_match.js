const axios = require('axios');

async function debugExistingContactsMatch() {
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

  const listC = await axios.get(`${baseUrl}/api/contacts`, { headers });
  console.log('List Contacts response structure:');
  console.log('Keys on data:', Object.keys(listC.data));
  console.log('Keys on data.data:', listC.data?.data ? Object.keys(listC.data.data) : 'NONE');
  console.log('Contacts array length:', (listC.data?.data?.contacts || listC.data?.contacts || []).length);
  
  const contactsList = listC.data?.data?.contacts || listC.data?.contacts || [];
  contactsList.forEach(c => {
    console.log(`  - ID: ${c._id}, Name: "${c.name}", Phone: "${c.phone}"`);
  });

  const testPhones = ["918726525782", "916388633422", "07970906978", "7970906978"];
  testPhones.forEach(tp => {
    const cleanPhone = tp.replace(/[^0-9]/g, "");
    const last10 = cleanPhone.slice(-10);
    const existing = contactsList.find(c => {
      const p = (c.phone || "").replace(/[^0-9]/g, "");
      return p === cleanPhone || (last10.length === 10 && p.endsWith(last10));
    });
    console.log(`Phone: ${tp} -> Clean: ${cleanPhone} -> Matched:`, existing ? existing.name : 'NO MATCH');
  });
}

debugExistingContactsMatch();
