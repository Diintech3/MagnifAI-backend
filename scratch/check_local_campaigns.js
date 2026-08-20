const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Get campaign count
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in DB:", collections.map(c => c.name));

  // Let's check the local Campaign model (if any)
  try {
    const Campaign = mongoose.model("Campaign");
    const localCampaigns = await Campaign.find({}).limit(5);
    console.log("Local campaigns:", JSON.stringify(localCampaigns, null, 2));
  } catch (e) {
    console.log("No local Campaign model found or error:", e.message);
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
