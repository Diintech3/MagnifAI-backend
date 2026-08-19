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

async function test() {
  const akkashGroupId = "6a82d07424d0dbb08e022ac7";
  console.log("=== Testing POST /api/app/whatsapp/groups/" + akkashGroupId + "/sync-members ===");
  
  // Add HIRDESH NAWANI, B.RANJIT and anand
  const res = await axios.post(`http://localhost:4000/api/app/whatsapp/groups/${akkashGroupId}/sync-members`, {
    selectedContacts: [
      { name: "HIRDESH NAWANI", phone: "919953100111" },
      { name: "B.RANJIT", phone: "919205511185" },
      { name: "anand", phone: "07970906978" }
    ],
    removedPhones: []
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Sync response:", res.data);

  // Now verify members in Akkash
  console.log("\n=== Verifying members in Akkash group ===");
  const res2 = await axios.get(`http://localhost:4000/api/app/whatsapp/groups/${akkashGroupId}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Akkash members count:", res2.data.members.length);
  console.log("Akkash members:", res2.data.members.map(m => m.name));
}

test().catch(e => console.error("Error:", e.response?.data || e.message));
