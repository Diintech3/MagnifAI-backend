const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const WhatsAppCampaignLog = mongoose.model("WhatsAppCampaignLog", new mongoose.Schema({}, { strict: false }));
  const log = await WhatsAppCampaignLog.findOne({ campaignId: "6a85c4be611f56253565c13b" });
  console.log("Database Log for latest campaign:", log);
  await mongoose.disconnect();
}

check().catch(console.error);
