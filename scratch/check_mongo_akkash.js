const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Group = mongoose.model("Group", new mongoose.Schema({}, { strict: false }));
  const Contact = mongoose.model("Contact", new mongoose.Schema({}, { strict: false }));

  const akkash = await Group.findOne({ name: /^akkash$/i });
  console.log("MongoDB Akkash Group:", akkash);
  console.log("MongoDB Akkash members array length:", akkash?.members?.length);
  if (akkash && akkash.members) {
    const contacts = await Contact.find({ _id: { $in: akkash.members } });
    console.log("Contacts in MongoDB Akkash (count " + contacts.length + "):");
    contacts.forEach(c => console.log(`- ${c._id} : ${c.name} (${c.phone})`));
  }
  await mongoose.disconnect();
}

check().catch(console.error);
