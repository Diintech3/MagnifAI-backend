const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Contact } = require('../src/models/Contact');

async function testWhatsappContactsClean() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const ceoId = ceo._id.toString();

  const filter = { ceoId: ceo._id };
  const allDbContacts = await Contact.find(filter).sort({ createdAt: -1 });

  const formattedContacts = allDbContacts.map(c => ({
    _id: c._id.toString(),
    id: c._id.toString(),
    name: c.name,
    phone: c.phone || "",
    company: c.company || "",
    email: c.email || "",
    isBusinessCard: Boolean(c.isBusinessCard || c.category === "Business Person")
  }));

  console.log('API Response data format check:');
  console.log('  success: true');
  console.log('  total contacts count:', formattedContacts.length);
  
  const regular = formattedContacts.filter(c => !c.isBusinessCard);
  const cards = formattedContacts.filter(c => c.isBusinessCard);
  console.log(`  People tab: ${regular.length}`);
  console.log(`  Cards tab: ${cards.length}`);
  cards.forEach(c => console.log(`    - ${c.name}: ${c.phone}`));

  await mongoose.disconnect();
}

testWhatsappContactsClean();
