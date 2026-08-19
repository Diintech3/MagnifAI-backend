const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function testBackendGroups() {
  await mongoose.connect(process.env.MONGODB_URI);
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  const response = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    {
      apiSharingKey: partnerKey,
      accessToken: clientToken,
      referenceKey: ref
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    }
  );

  let token = response.data?.token || response.data?.data?.token || response.data?.data?.accessToken || response.data?.accessToken;
  console.log("Token:", Boolean(token));

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  const gRes = await axios.get(
    `${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`,
    { headers }
  );
  console.log("Groups on Whats AI Server:", (gRes.data?.data?.groups || gRes.data?.groups || []).map(g => ({ id: g._id, name: g.name })));
  process.exit(0);
}

testBackendGroups().catch(e => { console.error("Error:", e.response ? e.response.data : e.message); process.exit(1); });
