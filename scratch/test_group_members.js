const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function testGroupMembers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const loginRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey } }
  );
  
  let token = loginRes.data?.token || loginRes.data?.data?.token || loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  const groupId = "6a84122f074e3be72ece7e35";

  // 1. Live contacts
  const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts`, { headers });
  const waContacts = cRes.data?.data?.contacts || cRes.data?.contacts || [];
  console.log("Total Contacts on Whats AI:", waContacts.length);

  const matched = waContacts.filter(c => {
    const groupArr = Array.isArray(c.group) ? c.group : [c.group].filter(Boolean);
    return groupArr.some(g => (g._id || g.id || g || "").toString() === groupId || (g.name || g || "").toLowerCase() === "akkash");
  });

  console.log(`Matched Contacts in Group 'Akkash': ${matched.length}`);
  console.log("Matched Contacts:", matched.map(c => ({ id: c._id, name: c.name, phone: c.phone })));
  process.exit(0);
}

testGroupMembers().catch(e => { console.error("Error:", e.response ? e.response.data : e.message); process.exit(1); });
