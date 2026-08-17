const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Check CEO model for Lakshami Raj Singh
  const { CEO } = require("../src/models/CEO");
  const ceos = await CEO.find({}).lean();
  
  console.log("=== ALL CEOs ===");
  ceos.forEach(c => {
    console.log(`Name: ${c.fullName || c.name}`);
    console.log(`  Email: ${c.email}`);
    console.log(`  whatsAppClientId: ${c.whatsAppClientId || "NOT SET"}`);
    console.log(`  whatsAppConnected: ${c.whatsAppConnected || "NOT SET"}`);
    console.log("---");
  });
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
