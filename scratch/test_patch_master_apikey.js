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

  const headersWithMasterApiKey = {
    Authorization: `Bearer ${token}`,
    "x-api-key": apiKey,
    "x-client-id": lakshmiClientId,
    "Content-Type": "application/json"
  };

  const anandId = "6a82cc2f24d0dbb08e02284f";
  const akkashGroupId = "6a82d07424d0dbb08e022ac7";

  console.log("=== Testing PATCH /api/contacts/" + anandId + " with x-api-key: " + apiKey + " ===");
  try {
    const res = await axios.patch(
      `${apiBaseUrl}/api/contacts/${anandId}`,
      { group: [akkashGroupId] },
      { headers: headersWithMasterApiKey }
    );
    console.log("PATCH response:", res.data);
  } catch (e) {
    console.log("PATCH error:", e.response?.data || e.message);
  }

  // Check anand
  const cRes = await axios.get(`${apiBaseUrl}/api/contacts`, { headers: headersWithMasterApiKey });
  const anand = (cRes.data?.data?.contacts || []).find(c => c.name === "anand");
  console.log("anand group:", JSON.stringify(anand?.group));
}

main().catch(console.error);
