const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
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
  const token = loginRes.data?.data?.accessToken || loginRes.data?.token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": "6a66f2c106372d3b8ea6b902"
  };

  const groupId = "6a82d07424d0dbb08e022ac7";
  try {
    const res = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
      { headers }
    );
    const allContacts = res.data?.data?.contacts || res.data?.contacts || [];
    console.log("Total contacts on Whats AI:", allContacts.length);
    
    const groupMembers = allContacts.filter(c => {
      const groupArr = Array.isArray(c.group) ? c.group : [c.group].filter(Boolean);
      return groupArr.some(g => {
        const gid = (g._id || g.id || g || "").toString();
        return gid === groupId;
      });
    });

    console.log(`Members of group ${groupId} on Whats AI:`);
    groupMembers.forEach(m => {
      console.log(`- Name: ${m.name} | Phone: ${m.phone} | Group:`, m.group);
    });
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
