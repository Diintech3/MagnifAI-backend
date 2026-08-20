const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const WhatsAppCampaignLog = mongoose.model("WhatsAppCampaignLog", new mongoose.Schema({}, { strict: false }));
  const log = await WhatsAppCampaignLog.findOne({ campaignId: "6a86c693436d42e9984dc03c" });
  console.log("Campaign Log details in MongoDB:");
  console.log(JSON.stringify(log, null, 2));
  await mongoose.disconnect();
}

run();
