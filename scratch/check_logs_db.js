const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const logs = await mongoose.connection.collection("whatsappcampaignlogs").find({}).toArray();
  console.log("Direct Collection Logs:", logs.map(l => ({
    campaignId: l.campaignId,
    name: l.name,
    templateName: l.templateName,
    groupName: l.groupName,
    status: l.status
  })));
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
