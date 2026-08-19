require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const CEO = mongoose.model("CEO", new mongoose.Schema({}, { strict: false }));
  
  const ceos = await CEO.find({}).lean();
  
  console.log("=== All CEOs - WhatsApp Client ID Check ===\n");
  for (const c of ceos) {
    console.log(`Name: ${c.name}`);
    console.log(`Email: ${c.email}`);
    console.log(`whatsAppClientId: ${c.whatsAppClientId || "NOT SET"}`);
    console.log(`isWhatsAppConnected: ${c.isWhatsAppConnected || false}`);
    console.log("---");
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
