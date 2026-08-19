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

  const masterHeaders = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  const clientHeaders = {
    ...masterHeaders,
    "x-client-id": lakshmiClientId
  };

  const anandId = "6a82cc2f24d0dbb08e02284f";
  const akkashGroupId = "6a82d07424d0dbb08e022ac7";

  console.log("=== 1. Test PATCH with masterHeaders (no x-client-id) ===");
  try {
    const r1 = await axios.patch(
      `${apiBaseUrl}/api/contacts/${anandId}`,
      { group: [akkashGroupId] },
      { headers: masterHeaders }
    );
    console.log("Master headers PATCH:", r1.data);
  } catch (e) {
    console.log("Master headers PATCH err:", e.response?.data || e.message);
  }

  console.log("\n=== 2. Test PUT /api/contacts/" + anandId + " with masterHeaders ===");
  try {
    const r2 = await axios.put(
      `${apiBaseUrl}/api/contacts/${anandId}`,
      { name: "anand", phone: "07970906978", group: [akkashGroupId] },
      { headers: masterHeaders }
    );
    console.log("Master headers PUT:", r2.data);
  } catch (e) {
    console.log("Master headers PUT err:", e.response?.data || e.message);
  }

  console.log("\n=== 3. Test POST /api/contacts with existing phone ===");
  try {
    const r3 = await axios.post(
      `${apiBaseUrl}/api/contacts`,
      { name: "anand", phone: "07970906978", group: [akkashGroupId] },
      { headers: clientHeaders }
    );
    console.log("POST /api/contacts response:", r3.data);
  } catch (e) {
    console.log("POST /api/contacts err:", e.response?.data || e.message);
  }

  console.log("\n=== 4. Check anand's group now ===");
  const cRes = await axios.get(`${apiBaseUrl}/api/contacts`, { headers: clientHeaders });
  const contacts = cRes.data?.data?.contacts || cRes.data?.contacts || [];
  const anand = contacts.find(c => c.name === "anand" || (c.phone || "").includes("7970906978"));
  console.log("anand now:", JSON.stringify(anand?.group));
}

main().catch(console.error);
