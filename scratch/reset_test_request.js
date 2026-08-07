const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function resetRequest() {
  const dbUri = process.env.MONGODB_URI;
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  const { CEO } = require("../src/models/CEO");
  const { App } = require("../src/models/App");
  const { OnboardingRequest } = require("../src/models/OnboardingRequest");

  const testEmail = "test_onboard_creator@gmail.com";

  // 1. Delete the CEO record created by the test script
  const deletedCEO = await CEO.deleteOne({ email: testEmail });
  console.log(`Deleted CEO record for ${testEmail}:`, deletedCEO.deletedCount);

  // 2. Reset onboarding request status back to Pending so it shows up in Pending tab
  const updatedReq = await OnboardingRequest.updateOne(
    { email: testEmail },
    { $set: { status: "Pending" } }
  );
  console.log(`Reset onboarding request status back to 'Pending':`, updatedReq.modifiedCount);

  await mongoose.disconnect();
  console.log("Done.");
}

resetRequest();
