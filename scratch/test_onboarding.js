const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:4000/api";

async function runTest() {
  console.log("=== STARTING ONBOARDING API INTEGRATION TEST ===");

  // 1. Connect to MongoDB to verify records and fetch OTPs
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI missing from environment.");
    process.exit(1);
  }
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB database.");

  // Clear any existing onboarding request for test email
  const testEmail = "test_onboard_creator@gmail.com";
  const { OnboardingRequest } = require("../src/models/OnboardingRequest");
  const { CEO } = require("../src/models/CEO");
  const { App } = require("../src/models/App");
  const { User } = require("../src/models/User");

  await OnboardingRequest.deleteOne({ email: testEmail });
  await CEO.deleteOne({ email: testEmail });
  await App.deleteOne({ email: testEmail });
  console.log(`Cleaned up previous test records for ${testEmail}.`);

  try {
    // ── STEP 1: Register Email & Send OTP ─────────────────────────────
    console.log("\n[Step 1] Sending Email OTP...");
    const step1Res = await axios.post(`${BASE_URL}/auth/register-step1-email`, {
      email: testEmail
    });
    console.log("Step 1 response:", step1Res.data);

    // Fetch email OTP from database
    let request = await OnboardingRequest.findOne({ email: testEmail });
    if (!request || !request.emailOtp) {
      throw new Error("Onboarding request or Email OTP not found in DB.");
    }
    const emailOtpCode = request.emailOtp;
    console.log(`Fetched Email OTP from DB: ${emailOtpCode}`);

    // Verify email OTP
    const verify1Res = await axios.post(`${BASE_URL}/auth/verify-step1-email`, {
      email: testEmail,
      otp: emailOtpCode
    });
    console.log("Email OTP Verification response:", verify1Res.data);

    // ── STEP 2: Submit Mobile & Send WhatsApp OTP ─────────────────────────────
    const testMobile = "+919999999999";
    console.log("\n[Step 2] Sending WhatsApp OTP...");
    const step2Res = await axios.post(`${BASE_URL}/auth/register-step2-mobile`, {
      email: testEmail,
      mobile: testMobile
    });
    console.log("Step 2 response:", step2Res.data);

    // Fetch WhatsApp OTP from database
    request = await OnboardingRequest.findOne({ email: testEmail });
    if (!request || !request.mobileOtp) {
      throw new Error("Onboarding request or Mobile OTP not found in DB.");
    }
    const mobileOtpCode = request.mobileOtp;
    console.log(`Fetched WhatsApp OTP from DB: ${mobileOtpCode}`);

    // Verify WhatsApp OTP
    const verify2Res = await axios.post(`${BASE_URL}/auth/verify-step2-mobile`, {
      email: testEmail,
      otp: mobileOtpCode
    });
    console.log("WhatsApp OTP Verification response:", verify2Res.data);

    // ── STEP 3: Submit Profile Data ─────────────────────────────
    console.log("\n[Step 3] Submitting Profile Data Form...");
    const step3Res = await axios.post(`${BASE_URL}/auth/register-step3-profile`, {
      email: testEmail,
      name: "Test Creator Name",
      organizationName: "Test Org Agency",
      designation: "Chief Director",
      address: "123 Test Street",
      city: "Test City",
      pincode: "110022",
      description: "This is a short bio under thirty words describing my creative abilities.",
      password: "securePassword123!"
    });
    console.log("Step 3 response:", step3Res.data);

    // ── STEP 4: Finalize Request Submission ─────────────────────────────
    console.log("\n[Step 4] Finalizing Registration Request...");
    const step4Res = await axios.post(`${BASE_URL}/auth/register-step4-photo`, {
      email: testEmail
    });
    console.log("Step 4 response:", step4Res.data);

    // Verify status is Pending
    request = await OnboardingRequest.findOne({ email: testEmail });
    console.log(`Registration status in DB: ${request.status} (Email Verified: ${request.isEmailVerified}, Mobile Verified: ${request.isMobileVerified})`);

    // Ensure we have a default App user in the DB to perform approval
    const testAppEmail = "founder_app_test@gmail.com";
    let appUser = await App.findOne({ email: testAppEmail });
    if (!appUser) {
      const { hashPassword } = require("../src/utils/password");
      // Find a superadmin to associate with createdBy
      const superadmin = await User.findOne();
      appUser = await App.create({
        businessName: "Test Platform App Workspace",
        fullName: "Workspace Owner",
        email: testAppEmail,
        mobile: "+919999999990",
        passwordHash: await hashPassword("securePassword123!"),
        dashboardType: "founder",
        createdBy: superadmin ? superadmin._id : new mongoose.Types.ObjectId()
      });
      console.log(`Created a new test App user: ${testAppEmail}`);
    } else {
      console.log(`Found existing test App user: ${testAppEmail}`);
    }

    // Login as the APP user
    const appLoginRes = await axios.post(`${BASE_URL}/auth/app/login`, {
      email: testAppEmail,
      password: "securePassword123!"
    });
    const appToken = appLoginRes.data.accessToken;
    console.log("Successfully logged in as App / Founder user.");

    // Fetch requests list via Founder API
    const getRequestsRes = await axios.get(`${BASE_URL}/app/onboarding-requests`, {
      headers: { Authorization: `Bearer ${appToken}` }
    });
    console.log(`Onboarding Requests list count: ${getRequestsRes.data.onboardingRequests.length}`);

    // Approve the request
    const approveRes = await axios.post(`${BASE_URL}/app/onboarding-requests/${request._id}/approve`, {}, {
      headers: { Authorization: `Bearer ${appToken}` }
    });
    console.log("Admin Approval response:", approveRes.data);

    // Verify CEO was created in database and linked to the active workspace
    const createdCEO = await CEO.findOne({ email: testEmail });

    if (createdCEO && createdCEO.appId.toString() === appUser._id.toString()) {
      console.log("\n✅ SUCCESS: CEO profile created and successfully linked to active App Workspace!");
      console.log(`Linked App ID: ${createdCEO.appId}`);
      console.log(`Created CEO ID: ${createdCEO._id} (Name: ${createdCEO.name}, Designation: ${createdCEO.designation}, RAG Client ID: ${createdCEO.ragClientId || "none"})`);
    } else {
      throw new Error("CEO record missing or linked to incorrect appId.");
    }

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.response ? err.response.data : err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    console.log("=== TEST SUITE COMPLETED ===");
  }
}

runTest();
