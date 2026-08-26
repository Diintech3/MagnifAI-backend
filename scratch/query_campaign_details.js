const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // 1. Inspect Campaigns
  const campaigns = await mongoose.connection.db.collection("campaigns").find({}).toArray();
  console.log(`\n=== CAMPAIGNS IN MONGODB (${campaigns.length}) ===`);
  if (campaigns.length > 0) {
    console.log("Keys in Campaign:", Object.keys(campaigns[0]));
    console.log("Sample Campaign:", JSON.stringify(campaigns[0], null, 2));
  } else {
    console.log("No campaigns found in campaigns collection.");
  }

  // 2. Inspect WhatsApp Campaign Logs
  const logs = await mongoose.connection.db.collection("whatsappcampaignlogs").find({}).toArray();
  console.log(`\n=== WHATSAPP CAMPAIGN LOGS IN MONGODB (${logs.length}) ===`);
  if (logs.length > 0) {
    console.log("Keys in WhatsApp Campaign Log:", Object.keys(logs[0]));
    console.log("Sample Log:", JSON.stringify(logs[0], null, 2));
  } else {
    console.log("No logs found in whatsappcampaignlogs collection.");
  }

  // 3. Inspect Scripts (YOVO connected scripts)
  const scripts = await mongoose.connection.db.collection("scripts").find({ campaignId: { $ne: null } }).toArray();
  console.log(`\n=== SCRIPTS WITH CAMPAIGN ID (${scripts.length}) ===`);
  if (scripts.length > 0) {
    console.log("Keys in Script:", Object.keys(scripts[0]));
    console.log("Sample Script:", JSON.stringify(scripts[0], null, 2));
  } else {
    console.log("No scripts found with a campaignId.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
