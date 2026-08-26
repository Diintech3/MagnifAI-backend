const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function getStats() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log("Connected to database successfully!");

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log("\nDocument counts in each collection:");
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }

    // Details of Users
    console.log("\n--- Users (First 3) ---");
    const users = await mongoose.connection.db.collection("users").find({}).limit(3).toArray();
    users.forEach(u => {
      console.log(`ID: ${u._id}, Email: ${u.email || u.username}, Role: ${u.role}, Name: ${u.name}`);
    });

    // Details of CEOs
    console.log("\n--- CEOs (First 3) ---");
    const ceos = await mongoose.connection.db.collection("ceos").find({}).limit(3).toArray();
    ceos.forEach(c => {
      console.log(`ID: ${c._id}, Email: ${c.email}, Role: ${c.role}, Name: ${c.name}, AppId: ${c.appId}`);
    });

    // Details of Apps
    console.log("\n--- Apps (First 3) ---");
    const apps = await mongoose.connection.db.collection("apps").find({}).limit(3).toArray();
    apps.forEach(a => {
      console.log(`ID: ${a._id}, Name: ${a.name}, Domain: ${a.domain}, OwnerEmail: ${a.ownerEmail}, ClientId: ${a.clientId}`);
    });

    // Details of Candidates
    console.log("\n--- Candidates (First 3) ---");
    const candidates = await mongoose.connection.db.collection("candidates").find({}).limit(3).toArray();
    candidates.forEach(c => {
      console.log(`ID: ${c._id}, Email: ${c.email}, Name: ${c.name || c.candidateName}`);
    });

    // Details of Campaigns
    console.log("\n--- Campaigns (First 3) ---");
    const campaigns = await mongoose.connection.db.collection("campaigns").find({}).limit(3).toArray();
    campaigns.forEach(c => {
      console.log(`ID: ${c._id}, Name: ${c.name}, Template: ${c.template || c.templateName}, Status: ${c.status}`);
    });

  } catch (err) {
    console.error("Failed to query database:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

getStats();
