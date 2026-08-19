const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function cleanMongo() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Group = mongoose.model("Group", new mongoose.Schema({}, { strict: false }));
  const Contact = mongoose.model("Contact", new mongoose.Schema({}, { strict: false }));

  const akkash = await Group.findOne({ name: /^akkash$/i });
  if (akkash && akkash.members) {
    const validContacts = await Contact.find({ _id: { $in: akkash.members } });
    akkash.members = validContacts.map(c => c._id);
    await akkash.save();
    console.log("Cleaned Akkash members:", akkash.members.length);
  }
  await mongoose.disconnect();
}

cleanMongo().catch(console.error);
