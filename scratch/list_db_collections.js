const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function listCollections() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log("Connected to database successfully!");

    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const dbsList = await admin.listDatabases();
    console.log("\nAvailable Databases:");
    dbsList.databases.forEach(db => {
      console.log(`- Name: ${db.name}, Size: ${db.sizeOnDisk} bytes`);
    });

    console.log("\nCollections in current database:");
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

  } catch (err) {
    console.error("Failed to inspect database:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }
}

listCollections();
