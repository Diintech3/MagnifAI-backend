const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";

async function main() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;
  const masterHeaders = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  console.log("=== Contacts under Master Partner ===");
  const cRes = await axios.get(`${apiBaseUrl}/api/contacts`, { headers: masterHeaders });
  const contacts = cRes.data?.data?.contacts || cRes.data?.contacts || [];
  const masterContacts = contacts.filter(c => c.userId === "6a6470b7898ec79989971158");
  console.log("Master contacts count:", masterContacts.length);
  if (masterContacts.length > 0) {
    const firstC = masterContacts[0];
    console.log("Testing PATCH on master contact:", firstC._id, firstC.name);
    const pRes = await axios.patch(
      `${apiBaseUrl}/api/contacts/${firstC._id}`,
      { group: ["6a82d07424d0dbb08e022ac7"] },
      { headers: masterHeaders }
    );
    console.log("Master PATCH result:", pRes.data);
  }
}

main().catch(console.error);
