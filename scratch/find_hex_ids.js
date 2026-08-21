const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const targetIds = ["6a6712cab661e9927c92a350", "6a68f26f86feedf812fa6a67", "6a6b1551c8cc32ce3311bcaf"];
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const coll of collections) {
    const name = coll.name;
    for (const idStr of targetIds) {
      try {
        const id = new mongoose.Types.ObjectId(idStr);
        const doc = await db.collection(name).findOne({ _id: id });
        if (doc) {
          console.log(`FOUND ID "${idStr}" in collection "${name}":`, JSON.stringify(doc, null, 2));
        }
      } catch (err) {
        // Some collections might have different search or ObjectId conversion issues
      }
    }
  }

  await mongoose.disconnect();
}

run();
