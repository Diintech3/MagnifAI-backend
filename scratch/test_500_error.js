const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  let token = "";
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const { CEO } = require("../src/models/CEO");
    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    const { signAccessToken } = require("../src/utils/jwt");
    token = signAccessToken({ sub: ceo._id, role: "CEO" });
    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to generate token:", err.message);
    return;
  }

  try {
    console.log("Calling GET /api/app/whatsapp/templates/list...");
    const res = await axios.get("http://localhost:4000/api/app/whatsapp/templates/list", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Response:", res.status, res.data);
  } catch (err) {
    console.log("Error status:", err.response?.status);
    console.log("Error response data:", JSON.stringify(err.response?.data, null, 2));
  }
}

run();
