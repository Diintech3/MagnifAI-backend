require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Group = mongoose.model("Group", new mongoose.Schema({}, { strict: false }));
  const Contact = mongoose.model("Contact", new mongoose.Schema({}, { strict: false }));
  
  // Lakshmi Raj's whatsAppClientId = 6a66f2c106372d3b8ea6b902 (this is ceoId in Group)
  const groups = await Group.find({}).lean();
  
  console.log("=== All Groups in MongoDB ===\n");
  for (const g of groups) {
    console.log(`Group Name: ${g.name}`);
    console.log(`Group _id: ${g._id}`);
    console.log(`ceoId: ${g.ceoId}`);
    console.log(`members count: ${g.members?.length || 0}`);
    console.log(`members: ${JSON.stringify(g.members)}`);
    console.log("---");
  }

  // Also check campaign target group ID
  const targetGroupId = "6a84122f074e3be72ece7e35";
  console.log(`\n=== Looking for campaign's targetGroup: ${targetGroupId} ===`);
  const found = await Group.findById(targetGroupId).lean();
  if (found) {
    console.log("Found group:", JSON.stringify(found, null, 2));
    if (found.members?.length > 0) {
      const contacts = await Contact.find({ _id: { $in: found.members } }).lean();
      console.log("Members contacts:", contacts.map(c => ({ name: c.name, phone: c.phone })));
    }
  } else {
    console.log("Group NOT FOUND in MongoDB with this ID!");
  }

  await mongoose.disconnect();
}

main().catch(console.error);
