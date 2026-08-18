const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Contact } = require('../src/models/Contact');
const { Group } = require('../src/models/Group');
const { CEO } = require('../src/models/CEO');

async function inspectPeopleAndGroups() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });
  console.log('CEO:', ceo.name, 'ceoId:', ceo._id);

  console.log('\n--- All Contacts for CEO in MongoDB ---');
  const contacts = await Contact.find({ ceoId: ceo._id }).lean();
  contacts.forEach(c => {
    console.log({
      id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      isBusinessCard: c.isBusinessCard,
      category: c.category,
      contactType: c.contactType,
      groupId: c.groupId
    });
  });

  console.log('\n--- All Groups in MongoDB for CEO ---');
  const groups = await Group.find({ ceoId: ceo._id }).lean();
  console.log('MongoDB Groups count:', groups.length);
  groups.forEach(g => {
    console.log({
      id: g._id.toString(),
      name: g.name,
      color: g.color,
      members: g.members
    });
  });

  await mongoose.disconnect();
}

inspectPeopleAndGroups();
