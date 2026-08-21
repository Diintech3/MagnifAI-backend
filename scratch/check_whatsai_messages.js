const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../W-A-backend/.env") });

async function checkDb() {
  const uri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";
  console.log("Connecting to Whats AI database...");
  await mongoose.connect(uri);
  console.log("Connected successfully!");

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  // Count total messages
  const messageCount = await db.collection("messages").countDocuments({});
  console.log("Total messages in 'messages' collection:", messageCount);

  // Group messages by userId and count them
  const messagesByUserId = await db.collection("messages").aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } }
  ]).toArray();
  console.log("Messages grouped by userId:", JSON.stringify(messagesByUserId, null, 2));

  // Let's print the first 5 messages to see their structure
  const first5 = await db.collection("messages").find({}).limit(5).toArray();
  console.log("Sample messages structure:", JSON.stringify(first5, null, 2));

  await mongoose.disconnect();
}

checkDb().catch(console.error);
