const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function checkVijayContacts() {
  const dbUri = process.env.MONGODB_URI;
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  const { Contact } = require("../src/models/Contact");
  const { CEO } = require("../src/models/CEO");
  const { App } = require("../src/models/App");

  // 1. Get all CEOs
  const ceos = await CEO.find();
  console.log("\n=== CEOS IN DATABASE ===");
  for (const c of ceos) {
    console.log(`CEO ID: ${c._id} | Name: ${c.name} | Email: ${c.email} | AppId: ${c.appId}`);
  }

  // 2. Count contacts by appId
  console.log("\n=== CONTACT COUNTS BY APP_ID IN CONTACTS COLLECTION ===");
  const countsByApp = await Contact.aggregate([
    { $group: { _id: "$appId", count: { $sum: 1 } } }
  ]);
  
  for (const item of countsByApp) {
    const app = await App.findById(item._id);
    console.log(`AppId: ${item._id} | BusinessName: ${app ? app.businessName : 'Unknown'} | Contact Count: ${item.count}`);
  }

  // 3. Count contacts by ceoId
  console.log("\n=== CONTACT COUNTS BY CEO_ID IN CONTACTS COLLECTION ===");
  const countsByCeo = await Contact.aggregate([
    { $group: { _id: "$ceoId", count: { $sum: 1 } } }
  ]);

  for (const item of countsByCeo) {
    let ceoName = "None/Undefined";
    if (item._id) {
      const ceo = await CEO.findById(item._id);
      ceoName = ceo ? ceo.name : 'Unknown CEO';
    }
    console.log(`CeoId: ${item._id} | CEOName: ${ceoName} | Contact Count: ${item.count}`);
  }

  // 4. Sample contact to see structure
  const sample = await Contact.findOne({ ceoId: null });
  if (sample) {
    console.log("\n=== SAMPLE CONTACT STRUCTURE (WITHOUT ceoId) ===");
    console.log(JSON.stringify(sample, null, 2));
  }

  await mongoose.disconnect();
}

checkVijayContacts();
