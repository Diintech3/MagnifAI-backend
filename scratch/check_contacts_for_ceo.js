const mongoose = require("mongoose");

async function checkContacts() {
  const dbUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB.");

  const { CEO } = require("../src/models/CEO");
  const { Contact } = require("../src/models/Contact");

  // Find Lakshami Raj Singh CEO profile
  const ceo = await CEO.findOne({ name: /Lakshami/i });
  if (!ceo) {
    console.error("CEO Lakshami Raj Singh not found!");
    await mongoose.disconnect();
    return;
  }

  console.log(`\nCEO Lakshami Raj Singh Info:`);
  console.log(`ID: ${ceo._id}`);
  console.log(`appId: ${ceo.appId}`);

  // Query all contacts for this appId
  const contacts = await Contact.find({ appId: ceo.appId });
  console.log(`\nTotal contacts for this appId (${ceo.appId}): ${contacts.length}`);
  
  if (contacts.length > 0) {
    contacts.forEach((c, i) => {
      console.log(`[Contact ${i+1}] Name: ${c.name}, Phone: ${c.phone}, contactType: ${c.contactType}, ceoId: ${c.ceoId}, category: ${c.category}`);
    });
  } else {
    console.log("No contacts found at all for this appId.");
  }

  // Let's also query all contacts in the database to see if there are any contacts at all
  const allContacts = await Contact.find();
  console.log(`\nTotal contacts in the entire database: ${allContacts.length}`);

  await mongoose.disconnect();
}

checkContacts();
