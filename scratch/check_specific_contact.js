const mongoose = require("mongoose");

async function checkDatabase() {
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  try {
    const { Contact } = require("../src/models/Contact");
    
    // Find all contacts matching the phone number
    const targetPhone = "+91 92855 11185";
    const contacts = await Contact.find({ phone: targetPhone }).lean();
    console.log("Contacts found with phone:", targetPhone);
    console.log(JSON.stringify(contacts, null, 2));

    // Get collection indexes
    const indexes = await Contact.collection.indexes();
    console.log("Collection Indexes:");
    console.log(JSON.stringify(indexes, null, 2));

  } catch (err) {
    console.error("Error during check:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
