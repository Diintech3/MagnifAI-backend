const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { signAccessToken } = require("../src/utils/jwt");

async function testEndpoint() {
  // 1. Connect to DB to load a CEO
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  const { CEO } = require("../src/models/CEO");
  const ceo = await CEO.findOne();
  if (!ceo) {
    console.error("No CEO found in DB to authenticate!");
    await mongoose.disconnect();
    return;
  }

  // 2. Generate a valid JWT token
  const token = signAccessToken({
    sub: ceo._id.toString(),
    role: "CEO",
    appId: ceo.appId.toString(),
    name: ceo.name,
    email: ceo.email
  });
  console.log("Signed JWT token for CEO:", ceo.name);
  await mongoose.disconnect();

  // 3. Prepare multipart request to local server
  const filePath = path.join(__dirname, "../../frontend/public/MagnifAI logo.jpeg");
  if (!fs.existsSync(filePath)) {
    console.error("Test image not found at:", filePath);
    return;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  try {
    console.log("Sending POST /api/app/people/scan-card to local server (Port 4000)...");
    const response = await axios.post(
      "http://localhost:4000/api/app/people/scan-card",
      form,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          ...form.getHeaders()
        }
      }
    );

    console.log("SUCCESS! Endpoint response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Request FAILED:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

testEndpoint();
