const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function checkTemplate() {
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

  const tRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/templates`, { headers });
  const templates = tRes.data?.data?.templates || tRes.data?.templates || [];
  console.log("Templates on Whats AI:", templates.map(t => ({
    id: t._id,
    name: t.name,
    templateName: t.templateName,
    language: t.language,
    status: t.status,
    category: t.category
  })));

  process.exit(0);
}

checkTemplate().catch(e => { console.error("Error:", e.response ? e.response.data : e.message); process.exit(1); });
