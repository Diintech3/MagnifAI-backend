const mongoose = require("mongoose");

async function checkDatabase() {
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  try {
    const { Contact } = require("../src/models/Contact");
    
    // Find all contacts containing the digits
    const targetDigits = "9285511185";
    const regex = new RegExp(targetDigits.split("").join("\\D*"));
    const contacts = await Contact.find({ phone: regex }).lean();
    console.log("Contacts found with matching digits:", targetDigits);
    console.log(JSON.stringify(contacts, null, 2));

  } catch (err) {
    console.error("Error during check:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
