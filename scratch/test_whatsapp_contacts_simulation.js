const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Contact } = require('../src/models/Contact');
const { App } = require('../src/models/App');

async function testWhatsappContactsRoute() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO found:', ceo.name, 'ID:', ceo._id.toString());

  const ceoId = ceo._id.toString();
  const filter = { ceoId: ceo._id };

  const allDbContacts = await Contact.find(filter).sort({ createdAt: -1 });

  console.log(`Total Contacts found in DB for CEO: ${allDbContacts.length}`);
  
  const formatted = allDbContacts.map(c => ({
    _id: c._id.toString(),
    id: c._id.toString(),
    name: c.name,
    phone: c.phone || "",
    company: c.company || "",
    email: c.email || "",
    isBusinessCard: Boolean(c.isBusinessCard || c.category === "Business Person")
  }));

  const regular = formatted.filter(c => !c.isBusinessCard);
  const cards = formatted.filter(c => c.isBusinessCard);

  console.log(`\nResults -> People count: ${regular.length}, Cards count: ${cards.length}`);
  console.log('People:');
  regular.forEach(r => console.log(`  - "${r.name}" (${r.phone})`));
  console.log('Cards:');
  cards.forEach(card => console.log(`  - "${card.name}" (${card.phone})`));

  await mongoose.disconnect();
}

testWhatsappContactsRoute();
