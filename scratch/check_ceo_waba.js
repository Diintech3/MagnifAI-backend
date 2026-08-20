const mongoose = require("mongoose");
const { CEO } = require("../src/models/CEO");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function checkCeoWaba() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (ceo) {
    console.log("CEO WABA credentials:");
    console.log("- Name:", ceo.name);
    console.log("- whatsAppClientId:", ceo.whatsAppClientId);
    console.log("- whatsAppPhoneId:", ceo.whatsAppPhoneId);
    console.log("- whatsAppWabaId:", ceo.whatsAppWabaId);
    console.log("- isWhatsAppConnected:", ceo.isWhatsAppConnected);
    console.log("- whatsAppToken:", ceo.whatsAppToken ? "SET" : "NOT SET");
  } else {
    console.log("CEO not found.");
  }
  await mongoose.disconnect();
}

checkCeoWaba().catch(console.error);
