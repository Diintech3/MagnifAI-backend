const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");

async function checkCeos() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully to DB!");

    const ceos = await CEO.find({});
    console.log(`\nFound ${ceos.length} CEOs in DB:`);
    ceos.forEach((c, index) => {
      console.log(`\n--- CEO #${index + 1} ---`);
      console.log(`Name:                 ${c.name}`);
      console.log(`Email:                ${c.email}`);
      console.log(`Company:              ${c.company}`);
      console.log(`WhatsApp Client ID:   ${c.whatsAppClientId}`);
      console.log(`WhatsApp Connected:   ${c.isWhatsAppConnected}`);
      console.log(`AdplifAI Client ID:   ${c.adplifAiClientId}`);
      console.log(`AdplifAI API Key:     ${c.adplifAiApiKey}`);
      console.log(`RAG Client ID:        ${c.ragClientId}`);
      console.log(`RAG Token:            ${c.ragToken}`);
      console.log(`Active Status:        ${c.isActive}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkCeos();
