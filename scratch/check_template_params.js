const axios = require("axios");

const apiBaseUrl = "https://w-a-backend.onrender.com";
const partnerKey = "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b";
const clientToken = "wa_token_362f69b4fa50ad3a2747d43feb9b97d01cd3e25ef90bbc67fc13e6133530b3c0";
const ref = "wa_ref_5079ca47a979a4c5aefa228c9834bd4e";
const apiKey = "whatsai-core-master-secret-key-2026";
const lakshmiClientId = "6a66f2c106372d3b8ea6b902";

async function main() {
  const loginRes = await axios.post(
    `${apiBaseUrl}/api/auth/api-sharing-login`,
    { apiSharingKey: partnerKey, accessToken: clientToken, referenceKey: ref },
    { headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, timeout: 30000 }
  );
  
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": lakshmiClientId,
    "Content-Type": "application/json"
  };

  console.log("=== Fetching All Templates from Whats AI ===");
  const tRes = await axios.get(`${apiBaseUrl}/api/templates`, { headers, timeout: 20000 });
  const templates = tRes.data?.data?.templates || tRes.data?.templates || tRes.data || [];
  
  console.log("Found", templates.length, "templates:\n");
  for (const t of templates) {
    console.log(`ID: ${t._id || t.id}`);
    console.log(`Name: ${t.name}`);
    console.log(`whatsappTemplateName: ${t.whatsappTemplateName}`);
    console.log(`category: ${t.category}`);
    console.log(`language: ${t.language || t.languageCode}`);
    console.log(`body: ${t.body || t.content}`);
    console.log(`variables: ${JSON.stringify(t.variables || t.bodyParams || t.params)}`);
    console.log("---");
  }
}

main().catch(console.error);
