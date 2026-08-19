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

async function testRemoval() {
  const akkashGroupId = "6a82d07424d0dbb08e022ac7";
  console.log("=== Syncing Akkash with only 3 members (removing 2 members) ===");
  
  const res = await axios.post(`http://localhost:4000/api/app/whatsapp/groups/${akkashGroupId}/sync-members`, {
    selectedContacts: [
      { name: "anand", phone: "07970906978" },
      { name: "raj", phone: "+918726525782" },
      { name: "HIRDESH NAWANI", phone: "919953100111" }
    ]
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Sync response:", res.data);

  // Check GET /members
  const res2 = await axios.get(`http://localhost:4000/api/app/whatsapp/groups/${akkashGroupId}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Updated Akkash members count:", res2.data.members.length);
  console.log("Updated Akkash members:", res2.data.members.map(m => m.name));

  // Check GET /groups
  const res3 = await axios.get(`http://localhost:4000/api/app/whatsapp/groups`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const akkashInList = res3.data.groups.find(g => g.name === "Akkash");
  console.log("Akkash in Groups Table List contactCount:", akkashInList?.contactCount);
}

testRemoval().catch(e => console.error("Error:", e.response?.data || e.message));
