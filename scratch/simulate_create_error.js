const mongoose = require("mongoose");

async function checkDatabase() {
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  try {
    const { Contact } = require("../src/models/Contact");
    
    // Simulate creation
    const res = await Contact.create({
      appId: "60b8d29f4f1a250015b6b801", // dummy valid ObjectId
      name: "B.RANJIT",
      phone: "+91 92855 11185",
      isBusinessCard: true,
      contactType: "card"
    });
    console.log("Created successfully:", res);

  } catch (err) {
    console.error("RAW ERROR:");
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
