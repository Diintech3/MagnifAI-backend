const mongoose = require("mongoose");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Contact } = require("../src/models/Contact");
  const { CEO } = require("../src/models/CEO");

  const ceos = await CEO.find({});
  console.log("CEOs in DB:", ceos.map(c => ({ id: c._id.toString(), name: c.name, email: c.email })));

  const allContacts = await Contact.find({});
  console.log(`Total Contacts in DB: ${allContacts.length}`);

  // Find duplicates by raw phone and by normalized 10-digit phone
  const phoneMap = {};
  allContacts.forEach(c => {
    const raw = c.phone || "";
    const clean = raw.replace(/[^0-9]/g, "");
    const last10 = clean.slice(-10);
    const key = `${c.ceoId || c.appId}_${last10}`;

    if (!phoneMap[key]) phoneMap[key] = [];
    phoneMap[key].push({
      _id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      clean,
      isBusinessCard: c.isBusinessCard,
      contactType: c.contactType,
      createdAt: c.createdAt
    });
  });

  const duplicates = Object.entries(phoneMap).filter(([k, list]) => list.length > 1);
  console.log(`\nDuplicate phone numbers found: ${duplicates.length}`);
  duplicates.forEach(([key, list]) => {
    console.log(`\nKey: ${key} (Count: ${list.length}):`);
    list.forEach(item => {
      console.log(` - ID: ${item._id} | Name: "${item.name}" | Phone: "${item.phone}" | Clean: "${item.clean}" | Card: ${item.isBusinessCard} | Type: ${item.contactType}`);
    });
  });

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
