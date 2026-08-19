const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { CEO } = require("../src/models/CEO");
  const ceos = await CEO.find({});
  console.log("CEOs whatsAppClientId and keys in DB:", ceos.map(c => ({
    name: c.name,
    email: c.email,
    whatsAppClientId: c.whatsAppClientId,
    whatsAppToken: Boolean(c.whatsAppToken),
    adplifAiClientId: c.adplifAiClientId,
    adplifAiApiKey: Boolean(c.adplifAiApiKey)
  })));
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
