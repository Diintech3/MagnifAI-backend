const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function inspectWhatsAiDb() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  // Swap database name to whatsapp-automation
  const parts = dbUri.split('/');
  const baseUri = parts.slice(0, -1).join('/');
  const whatsAiDbUri = `${baseUri}/whatsapp-automation`;

  try {
    console.log(`Connecting to WhatsAI Database: ${whatsAiDbUri}`);
    const conn = await mongoose.createConnection(whatsAiDbUri).asPromise();
    console.log("Connected successfully!");

    const collections = await conn.db.listCollections().toArray();
    console.log("\nWhatsAI Collections:");
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // Check users/clients collection
    const usersCol = conn.collection("users");
    const sampleUser = await usersCol.findOne({});
    console.log("\nSample User/Client from WhatsAI 'users' collection:");
    console.log(JSON.stringify(sampleUser, null, 2));

    // Check if there is a settings collection
    const settingsCol = conn.collection("settings");
    const sampleSetting = await settingsCol.findOne({});
    console.log("\nSample Setting from WhatsAI 'settings' collection:");
    console.log(JSON.stringify(sampleSetting, null, 2));

  } catch (err) {
    console.error("Failed to inspect WhatsAI database:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

inspectWhatsAiDb();
