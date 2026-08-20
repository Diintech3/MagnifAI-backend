const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Message = mongoose.model("Message", new mongoose.Schema({}, { strict: false }));
  
  // Find messages related to the campaign
  const messages = await Message.find().sort({ createdAt: -1 }).limit(10);
  console.log("Recent messages in MongoDB:");
  messages.forEach(m => {
    console.log(`- To: ${m.to} | Body: ${m.body} | Status: ${m.status} | campaignId: ${m.campaignId} | errorReason: ${m.errorReason}`);
  });
  await mongoose.disconnect();
}

run().catch(console.error);
