const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function queryDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', process.env.MONGODB_URI);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('\n=== COLLECTIONS ===');
  for (let col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`- ${col.name}: ${count} docs`);
  }

  // Check campaigns in DB
  if (collections.some(c => c.name === 'campaigns')) {
    const campaigns = await db.collection('campaigns').find({}).toArray();
    console.log(`\n=== CAMPAIGNS COLLECTION (${campaigns.length} docs) ===`);
    campaigns.forEach((c, idx) => {
      console.log(`${idx + 1}.`, JSON.stringify(c));
    });
  }

  // Let's also check if there is an adCampaigns or similar collection
  await mongoose.disconnect();
}

queryDb();
