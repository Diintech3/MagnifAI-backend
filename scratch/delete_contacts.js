const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function deleteContacts() {
  const dbUri = process.env.MONGODB_URI;
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  const { Contact } = require("../src/models/Contact");

  const beforeCount = await Contact.countDocuments();
  console.log(`Contacts count before deletion: ${beforeCount}`);

  const deleteResult = await Contact.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} contacts from the database.`);

  const afterCount = await Contact.countDocuments();
  console.log(`Contacts count after deletion: ${afterCount}`);

  await mongoose.disconnect();
}

deleteContacts();
