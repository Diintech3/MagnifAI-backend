const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const localUrl = "http://localhost:4000/api/app/whatsapp/upload-media";
  
  // 1. Get a test token (Login as CEO)
  console.log("Logging in as CEO...");
  let token = "";
  try {
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGODB_URI);
    const { CEO } = require("../src/models/CEO");
    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    const { signAccessToken } = require("../src/utils/jwt");
    token = signAccessToken({ sub: ceo._id, role: "CEO" });
    await mongoose.disconnect();
  } catch (err) {
    console.error("DB token generation failed:", err.message);
    return;
  }

  if (!token) {
    console.error("Failed to obtain CEO auth token!");
    return;
  }
  console.log("Token obtained successfully.");

  // 2. Prepare mock file
  const testFilePath = path.join(__dirname, "test_upload_file.jpg");
  fs.writeFileSync(testFilePath, "mock jpeg content");
  console.log("Created mock test file.");

  // 3. Perform upload
  const form = new FormData();
  form.append("file", fs.createReadStream(testFilePath), {
    filename: "test_upload_file.jpg",
    contentType: "image/jpeg"
  });

  try {
    console.log("Sending upload request to backend...");
    const uploadRes = await axios.post(localUrl, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("\nUpload Response:", JSON.stringify(uploadRes.data, null, 2));
    if (uploadRes.data.success && uploadRes.data.url) {
      console.log("\nSUCCESS: Media uploaded and R2 URL returned successfully!");
    } else {
      console.error("\nFAILURE: Upload response is missing success or URL.");
    }
  } catch (err) {
    console.error("\nUpload Error Message:", err.message);
    if (err.response) {
      console.error("Upload Error Status:", err.response.status);
      console.error("Upload Error Data:", JSON.stringify(err.response.data, null, 2));
    }
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log("Cleaned up mock test file.");
    }
  }
}

run();
