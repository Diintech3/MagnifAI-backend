const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:4000/api";

async function runResetTest() {
  console.log("=== STARTING FORGOT/RESET PASSWORD INTEGRATION TEST ===");

  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI missing from environment.");
    process.exit(1);
  }
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB database.");

  const { CEO } = require("../src/models/CEO");
  const testEmail = "test_onboard_creator@gmail.com";

  try {
    // 1. Ensure test CEO exists
    let ceo = await CEO.findOne({ email: testEmail });
    if (!ceo) {
      throw new Error(`Test CEO with email ${testEmail} does not exist. Run test_onboarding.js first.`);
    }

    console.log(`Found CEO profile for: ${ceo.name}`);

    // 2. Call forgot-password endpoint
    console.log("\n[Forgot Password] Requesting reset OTP...");
    const forgotRes = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: testEmail
    });
    console.log("Forgot Password response:", forgotRes.data);

    // 3. Fetch resetOtp from database
    ceo = await CEO.findOne({ email: testEmail });
    const otpCode = ceo.resetOtp;
    if (!otpCode) {
      throw new Error("Reset OTP code was not generated in the database.");
    }
    console.log(`Fetched Reset OTP from DB: ${otpCode}`);

    // 4. Reset password
    const newPass = "superSecureResetPassword999!";
    console.log("\n[Reset Password] Submitting new password and OTP verification...");
    const resetRes = await axios.post(`${BASE_URL}/auth/reset-password`, {
      email: testEmail,
      otp: otpCode,
      newPassword: newPass
    });
    console.log("Reset Password response:", resetRes.data);

    // 5. Test CEO login with the new password
    console.log("\n[Auth] Verifying login with the new reset password...");
    const loginRes = await axios.post(`${BASE_URL}/auth/ceo/login`, {
      email: testEmail,
      password: newPass
    });
    
    if (loginRes.data.accessToken) {
      console.log("✅ SUCCESS: Successfully logged in as CEO using the new reset password!");
      console.log(`Logged in CEO Name: ${loginRes.data.user.name}`);
    } else {
      throw new Error("Login failed; no accessToken returned.");
    }

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.response ? err.response.data : err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    console.log("=== RESET TEST SUITE COMPLETED ===");
  }
}

runResetTest();
