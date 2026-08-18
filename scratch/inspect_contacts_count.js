const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Contact } = require('../src/models/Contact');
const { Group } = require('../src/models/Group');

async function inspectContactsCount() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const allContacts = await Contact.find({ ceoId: ceo._id });
  console.log(`Total Contacts for CEO ${ceo.name} in MongoDB: ${allContacts.length}`);
  allContacts.forEach((c, i) => {
    console.log(`${i + 1}. Name: "${c.name}", Phone: "${c.phone}", Source: "${c.source}"`);
  });

  const groups = await Group.find({ ceoId: ceo._id });
  console.log(`\nGroups in MongoDB:`);
  for (const g of groups) {
    console.log(`- Group "${g.name}": ${g.members?.length || 0} members`);
  }

  await mongoose.disconnect();
}

inspectContactsCount();
