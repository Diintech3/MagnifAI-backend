const axios = require("axios");

// Generate or use CEO Lakshmi Raj's token
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
  console.log("=== Test 1: GET /api/app/whatsapp/groups ===");
  const res1 = await axios.get("http://localhost:4000/api/app/whatsapp/groups", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Groups Count:", res1.data.groups.length);
  for (const g of res1.data.groups) {
    console.log(`- ${g.name} (ID: ${g._id || g.id}) -> Contact Count: ${g.contactCount}`);
  }

  if (res1.data.groups.length > 0) {
    const firstG = res1.data.groups.find(g => g.name === "Akkash") || res1.data.groups[0];
    const gid = firstG._id || firstG.id;
    console.log(`\n=== Test 2: GET /api/app/whatsapp/groups/${gid}/members (${firstG.name}) ===`);
    const res2 = await axios.get(`http://localhost:4000/api/app/whatsapp/groups/${gid}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Group Info:", res2.data.group);
    console.log("Members Count:", res2.data.members.length);
    console.log("Member Names:", res2.data.members.map(m => m.name));
  }
}

test().catch(e => console.error("Error:", e.response?.data || e.message));
