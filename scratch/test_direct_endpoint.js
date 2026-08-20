const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

const token = jwt.sign({
  sub: "6a65df76ba9914893a35508f", // Lakshmi Raj Singh CEO ID
  appId: "6a1ab0ea2af329ff8732de0b",
  email: "singhlakshmiraj@gmail.com",
  role: "CEO",
  name: "Lakshami Raj Singh"
}, secret, { expiresIn: "1h" });

async function run() {
  console.log("Calling direct send-template endpoint on local backend...");
  try {
    const res = await axios.post("http://localhost:4000/api/app/whatsapp/send-template", {
      phone: "917970906978",
      templateName: "ai_assistant",
      language: "en",
      variables: [{ key: "1", value: "Direct Send Test" }]
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Response:", res.data);
  } catch (e) {
    console.error("Error:", e.response?.data || e.message);
  }
}

run();
