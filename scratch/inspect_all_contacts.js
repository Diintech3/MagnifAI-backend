const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Contact } = require('../src/models/Contact');

async function inspectAllContacts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const all = await Contact.find({ ceoId: ceo._id }).lean();

  console.log(`=== ALL CONTACTS IN DB FOR CEO (${all.length}) ===`);
  all.forEach((c, i) => {
    console.log(`${i + 1}. Name: "${c.name}", Phone: "${c.phone}", isCard: ${c.isBusinessCard}, Type: "${c.contactType}"`);
  });

  await mongoose.disconnect();
}

inspectAllContacts();
