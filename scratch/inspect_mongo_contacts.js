const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Contact } = require('../src/models/Contact');
const { CEO } = require('../src/models/CEO');

async function inspectContacts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO ID:', ceo._id.toString(), 'appId:', ceo.appId?.toString());

  const byCeoId = await Contact.find({ ceoId: ceo._id }).lean();
  console.log(`Contacts with ceoId = ${ceo._id}: ${byCeoId.length}`);
  byCeoId.forEach(c => console.log('  -', c.name, c.phone, 'isBusinessCard:', c.isBusinessCard, 'category:', c.category));

  const byAppId = await Contact.find({ appId: ceo.appId }).lean();
  console.log(`\nContacts with appId = ${ceo.appId}: ${byAppId.length}`);

  const allContacts = await Contact.find({}).limit(10).lean();
  console.log(`\nSample contacts in DB (total found: ${allContacts.length}):`);
  allContacts.forEach(c => console.log('  -', c.name, c.phone, 'ceoId:', c.ceoId, 'appId:', c.appId));

  await mongoose.disconnect();
}

inspectContacts();
