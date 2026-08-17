const mongoose = require("mongoose");

async function dropIndex() {
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  try {
    const { Contact } = require("../src/models/Contact");
    
    // Drop the old index
    const indexName = "appId_1_phone_1";
    console.log(`Attempting to drop index: ${indexName}`);
    await Contact.collection.dropIndex(indexName);
    console.log(`Successfully dropped index: ${indexName}`);

    // Print remaining indexes
    const indexes = await Contact.collection.indexes();
    console.log("Updated Collection Indexes:");
    console.log(JSON.stringify(indexes, null, 2));

  } catch (err) {
    console.error("Error dropping index:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

dropIndex();
