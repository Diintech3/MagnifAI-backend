const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");
const { Group } = require("../src/models/Group");
const { Contact } = require("../src/models/Contact");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO not found.");
    process.exit(1);
  }

  // Find the Group named 'Akkash'
  const group = await Group.findOne({ name: "Akkash", ceoId: ceo._id });
  if (!group) {
    console.error("Group 'Akkash' not found in MongoDB.");
    process.exit(1);
  }

  console.log("Group 'Akkash' Details:", {
    _id: group._id,
    name: group.name,
    membersCount: group.members.length
  });

  const members = await Contact.find({ _id: { $in: group.members } });
  console.log(`\nMembers in Group 'Akkash' (${members.length}):`);
  members.forEach((m, idx) => {
    console.log(`${idx + 1}. Name: "${m.name}", Phone: "${m.phone}", Source: "${m.source || "none"}", CreatedAt: ${m.createdAt}`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
