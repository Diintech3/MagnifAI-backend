const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function checkCampaignLogs() {
  await mongoose.connect(process.env.MONGODB_URI);
  const WhatsAppCampaignLog = mongoose.model("WhatsAppCampaignLog", new mongoose.Schema({}, { strict: false }));
  const logs = await WhatsAppCampaignLog.find().sort({ createdAt: -1 }).limit(4);
  console.log("Recent Campaign Logs in MongoDB:");
  logs.forEach(l => {
    console.log(`- Name: ${l.name} | Template: ${l.templateName} (${l.templateId}) | VariablesMapping:`, l.variablesMapping);
  });
  await mongoose.disconnect();
}

checkCampaignLogs().catch(console.error);
