const mongoose = require("mongoose");

async function checkWhatsAiUsers() {
  const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully to WhatsAI DB!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("\nCollections:", collections.map(c => c.name));

    const usersCol = db.collection("users");
    const users = await usersCol.find({}).toArray();
    console.log(`\nFound ${users.length} users in WhatsAI DB:`);
    users.forEach((u, i) => {
      console.log(`- #${i+1} Name: ${u.name} | Email: ${u.email} | Phone: ${u.phone} | ClientID: ${u._id} | Role: ${u.role}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkWhatsAiUsers();
