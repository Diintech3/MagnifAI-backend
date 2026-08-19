const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Group } = require("../src/models/Group");
  const groupsInDb = await Group.find({});
  console.log("Groups in MongoDB:", groupsInDb.map(g => ({ id: g._id.toString(), name: g.name })));

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
  console.log("Login token acquired:", Boolean(token));

  const gRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey }
  });
  const groups = gRes.data?.data?.groups || gRes.data?.groups || [];
  console.log("Groups on Whats AI Server:", groups.map(g => ({ id: (g._id || g.id).toString(), name: g.name })));

  const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": partnerKey }
  });
  const campaigns = cRes.data?.data?.campaigns || cRes.data?.campaigns || [];
  console.log("Campaigns on Whats AI Server:", campaigns.map(c => ({
    id: c._id,
    name: c.name,
    targetGroup: c.targetGroup,
    template: c.template
  })));

  process.exit(0);
}
check().catch(e => { console.error(e.response ? e.response.data : e.message); process.exit(1); });
