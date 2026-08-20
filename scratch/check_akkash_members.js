const mongoose = require("mongoose");
const { Group } = require("../src/models/Group");
const { Contact } = require("../src/models/Contact");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Groups in MongoDB:");
  const groups = await Group.find();
  groups.forEach(g => {
    console.log(`- Name: ${g.name} | ID: ${g._id} | Members count: ${g.members?.length}`);
  });

  console.log("\nContacts in MongoDB:");
  const contacts = await Contact.find().limit(10);
  contacts.forEach(c => {
    console.log(`- Name: ${c.name} | Phone: ${c.phone} | ID: ${c._id}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
