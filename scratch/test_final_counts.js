const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Contact } = require('../src/models/Contact');
const { Group } = require('../src/models/Group');
const { CEO } = require('../src/models/CEO');

async function testFinalCounts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const allDbContacts = await Contact.find({ ceoId: ceo._id }).sort({ createdAt: -1 });

  const formattedContacts = allDbContacts.map(c => ({
    _id: c._id.toString(),
    id: c._id.toString(),
    name: c.name,
    phone: c.phone || "",
    company: c.company || "",
    email: c.email || "",
    isBusinessCard: Boolean(c.isBusinessCard === true || c.contactType === "card")
  }));

  const regular = formattedContacts.filter(c => !c.isBusinessCard);
  const cards = formattedContacts.filter(c => c.isBusinessCard);

  console.log(`\nVerified Counts for ${ceo.name}:`);
  console.log(`  People tab (${regular.length}):`);
  regular.forEach(r => console.log(`    - "${r.name}" (${r.phone})`));

  console.log(`  Cards tab (${cards.length}):`);
  cards.forEach(c => console.log(`    - "${c.name}" (${c.phone})`));

  const mongoGroups = await Group.find({ ceoId: ceo._id });
  console.log(`  Groups (${mongoGroups.length}):`);
  mongoGroups.forEach(g => console.log(`    - "${g.name}" (${g.members.length} members)`));

  await mongoose.disconnect();
}

testFinalCounts();
