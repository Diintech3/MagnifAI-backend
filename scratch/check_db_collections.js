const mongoose = require("mongoose");

async function checkCollections() {
  const dbUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB.");

  // Get all collections in the database
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("\nCollections in database:");
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`- ${col.name} (Documents count: ${count})`);
  }

  // Let's print the schema or first document of any chat/session collections to understand them
  await mongoose.disconnect();
}

checkCollections();
