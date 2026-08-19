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

  console.log("=== 1. Find contact 'anand' in Whats AI ===");
  const cRes = await axios.get(`${apiBaseUrl}/api/contacts`, { headers });
  const contacts = cRes.data?.data?.contacts || cRes.data?.contacts || [];
  const anand = contacts.find(c => c.name === "anand" || (c.phone || "").includes("7970906978"));
  console.log("Contact anand:", anand);

  const akkashGroupId = "6a82d07424d0dbb08e022ac7";

  if (anand) {
    console.log("\n=== 2. Try PATCH /api/contacts/" + anand._id + " with group ===");
    try {
      const patchRes = await axios.patch(
        `${apiBaseUrl}/api/contacts/${anand._id}`,
        { group: [akkashGroupId] },
        { headers }
      );
      console.log("PATCH response:", patchRes.data);
    } catch (e) {
      console.log("PATCH error:", e.response?.data || e.message);
    }

    console.log("\n=== 3. Verify if anand is now in Akkash group ===");
    const cRes2 = await axios.get(`${apiBaseUrl}/api/contacts`, { headers });
    const contacts2 = cRes2.data?.data?.contacts || cRes2.data?.contacts || [];
    const anand2 = contacts2.find(c => c.name === "anand" || (c.phone || "").includes("7970906978"));
    console.log("anand after patch:", JSON.stringify(anand2?.group));
  }
}

main().catch(console.error);
