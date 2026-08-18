const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');
const { Contact } = require('../src/models/Contact');
const { App } = require('../src/models/App');

async function testWithAppIdOrCeoId() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  const app = await App.findById(ceo.appId);

  const filter = { $or: [{ ceoId: ceo._id }, { appId: app._id }] };
  const allDbContacts = await Contact.find(filter).sort({ createdAt: -1 });

  console.log(`Total Contacts found: ${allDbContacts.length}`);
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

  console.log(`People count: ${regular.length}, Cards count: ${cards.length}`);
  await mongoose.disconnect();
}

testWithAppIdOrCeoId();
