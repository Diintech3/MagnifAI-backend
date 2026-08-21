const mongoose = require("mongoose");

async function run() {
  const uri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  // Find Lakshami Raj's CEO client ID in Whats AI (which is 6a66f2c106372d3b8ea6b902)
  const clientUser = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId("6a66f2c106372d3b8ea6b902") });
  console.log("Client User (6a66f2c106372d3b8ea6b902):", JSON.stringify(clientUser, null, 2));

  // Find the API Sharing User which matches the credentials we use
  const apiSharingUser = await db.collection("users").findOne({ 
    "apiSharing.apiSharingKey": "wa_share_8c4b2a1d6bc29e75c0ce4466d109ea27d2957c01a911515b"
  });
  console.log("\nAPI Sharing User:", JSON.stringify(apiSharingUser, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
