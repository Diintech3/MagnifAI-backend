const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

async function inspectMongoTemplates() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  // Check all collections in MongoDB
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', collections.map(c => c.name));

  for (const col of collections) {
    if (col.name.toLowerCase().includes('template')) {
      const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
      console.log(`\nFound collection "${col.name}" with ${docs.length} docs:`);
      docs.forEach(d => console.log('  -', JSON.stringify(d)));
    }
  }

  await mongoose.disconnect();
}

inspectMongoTemplates();
