const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function checkDb() {
  const dbUri = process.env.MONGODB_URI;
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  const { App } = require("../src/models/App");
  const { CEO } = require("../src/models/CEO");
  const { OnboardingRequest } = require("../src/models/OnboardingRequest");

  console.log("\n=== ALL APP WORKSPACES ===");
  const apps = await App.find();
  apps.forEach(a => {
    console.log(`App ID: ${a._id} | Name: ${a.businessName} | Email: ${a.email}`);
  });

  console.log("\n=== ALL CEOS ===");
  const ceos = await CEO.find();
  ceos.forEach(c => {
    console.log(`CEO ID: ${c._id} | Name: ${c.name} | Email: ${c.email} | App ID: ${c.appId}`);
  });

  console.log("\n=== ALL APPROVED ONBOARDING REQUESTS ===");
  const requests = await OnboardingRequest.find({ status: "Approved" });
  requests.forEach(r => {
    console.log(`Request ID: ${r._id} | Name: ${r.name} | Email: ${r.email} | Status: ${r.status}`);
  });

  await mongoose.disconnect();
}

checkDb();
