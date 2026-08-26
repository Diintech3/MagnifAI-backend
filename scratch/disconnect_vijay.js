const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database");

  const { CEO } = require("../src/models/CEO");
  
  // Find Vijay
  const vijay = await CEO.findOne({ name: /vijay/i });
  if (!vijay) {
    console.error("Vijay's account not found in database.");
    process.exit(1);
  }

  console.log(`Found CEO account: ${vijay.name} (${vijay.email})`);
  console.log("Current YOVO status:");
  console.log(" - isYovoConnected:", vijay.isYovoConnected);
  console.log(" - yovoClientId:", vijay.yovoClientId);
  console.log(" - yovoToken:", vijay.yovoToken);

  // Disconnect YOVO
  vijay.isYovoConnected = false;
  vijay.yovoClientId = null;
  vijay.yovoToken = null;
  vijay.yovoClientInfo = null;

  await vijay.save();
  console.log("\nYOVO AI account successfully disconnected for Vijay!");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error("Failed to disconnect Vijay:", e.message);
  mongoose.disconnect();
  process.exit(1);
});
