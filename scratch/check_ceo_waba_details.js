const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO singhlakshmiraj@gmail.com not found.");
    process.exit(1);
  }

  console.log("Lakshami Raj Singh WhatsApp Settings in DB:");
  console.log({
    whatsAppClientId: ceo.whatsAppClientId,
    whatsAppPhoneId: ceo.whatsAppPhoneId,
    whatsAppWabaId: ceo.whatsAppWabaId,
    whatsAppTokenLength: ceo.whatsAppToken ? ceo.whatsAppToken.length : 0,
    isWhatsAppConnected: ceo.isWhatsAppConnected,
    updatedAt: ceo.updatedAt
  });

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
