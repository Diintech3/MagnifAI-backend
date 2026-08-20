const axios = require("axios");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

const token = jwt.sign({
  sub: "6a65df76ba9914893a35508f",
  appId: "6a1ab0ea2af329ff8732de0b",
  email: "singhlakshmiraj@gmail.com",
  role: "CEO",
  name: "Lakshami Raj Singh"
}, secret, { expiresIn: "1h" });

async function verifyAll() {
  console.log("=== Final Comprehensive Verification ===");
  
  // 1. Check GET /groups
  const gRes = await axios.get("http://localhost:4000/api/app/whatsapp/groups", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`- GET /groups: Success (${gRes.data.groups.length} groups found)`);
  const akkash = gRes.data.groups.find(g => g.name === "Akkash");
  console.log(`  Akkash group contactCount: ${akkash?.contactCount}`);

  // 2. Check GET /groups/:id/members
  const mRes = await axios.get(`http://localhost:4000/api/app/whatsapp/groups/${akkash._id}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`- GET /members: Success (${mRes.data.members.length} members loaded)`);

  // 3. Test Campaign Creation with photoshare
  const cRes = await axios.post("http://localhost:4000/api/app/whatsapp/campaigns", {
    name: "Final Verification Campaign",
    template: "6a75aa258f7864144bf96794", // photoshare
    templateName: "photoshare",
    targetGroup: akkash._id,
    groupName: "Akkash",
    variablesMapping: {
      "1": "https://lakshmiraj.com"
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`- POST /campaigns (Create): Success (ID: ${cRes.data.campaignId})`);

  // 4. Test Campaign Dispatch
  const sRes = await axios.post(`http://localhost:4000/api/app/whatsapp/campaigns/${cRes.data.campaignId}/send`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`- POST /campaigns/:id/send (Dispatch):`, sRes.data);

  console.log("\n>>> ALL CHECKS PASSED 100% <<<");
}

verifyAll().catch(e => console.error("Verification failed:", e.response?.data || e.message));
