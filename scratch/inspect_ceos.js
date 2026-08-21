const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");

async function checkCeos() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    const ceos = await CEO.find({});
    console.log(`\nFound ${ceos.length} CEOs in DB:`);
    ceos.forEach(c => {
      console.log(`- Name: ${c.name} | Email: ${c.email}`);
      console.log(`  WhatsApp Client ID: ${c.whatsAppClientId}`);
      console.log(`  WhatsApp Connected: ${c.isWhatsAppConnected}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkCeos();
