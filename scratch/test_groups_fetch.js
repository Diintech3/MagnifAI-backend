const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function testGroups() {
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
  
  let token = loginRes.data?.token || loginRes.data?.data?.token || loginRes.data?.accessToken;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": apiKey,
    "Content-Type": "application/json"
  };

  const res = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`, { headers });
  console.log("SUCCESS! Groups returned:", res.data?.data?.groups?.length || res.data?.groups?.length);
  console.log("Groups:", (res.data?.data?.groups || res.data?.groups || []).map(g => ({ id: g._id, name: g.name })));
}

testGroups().catch(e => { console.error("Error:", e.response ? e.response.data : e.message); });
