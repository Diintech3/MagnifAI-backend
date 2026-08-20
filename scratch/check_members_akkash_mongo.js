const mongoose = require("mongoose");
const { Group } = require("../src/models/Group");
const { Contact } = require("../src/models/Contact");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const group = await Group.findById("6a82d07487a6e20cceb761e4");
  console.log("Group name:", group.name);
  console.log("Members raw IDs:", group.members);
  
  const contacts = await Contact.find({ _id: { $in: group.members } });
  contacts.forEach(c => {
    console.log(`- Contact name: ${c.name} | phone: ${c.phone} | Raw Contact:`, c);
  });
  await mongoose.disconnect();
}

run().catch(console.error);
