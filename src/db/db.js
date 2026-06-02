const mongoose = require("mongoose");
const { env } = require("../config/env");

function printAtlasHelp() {
  // eslint-disable-next-line no-console
  console.error(`
[db] MongoDB Atlas connection failed.

Fix in MongoDB Atlas (https://cloud.mongodb.com):
  1. Network Access → Add IP Address → "Add Current IP Address"
     (dev only: you can use 0.0.0.0/0 — allow from anywhere)
  2. Database Access → confirm DB user exists with read/write on this database
  3. Wait 1–2 minutes after saving, then run: node index.js

If password has special characters (@, #, %), URL-encode it inside MONGODB_URI in .env
`);
}

async function connectDB() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4,
    });
    // eslint-disable-next-line no-console
    console.log("[db] MongoDB connected →", mongoose.connection.name);
  } catch (err) {
    const isAtlas = env.MONGODB_URI.includes("mongodb.net");
    const isSelection =
      err.name === "MongooseServerSelectionError" ||
      err.message?.includes("whitelist") ||
      err.message?.includes("ReplicaSetNoPrimary");

    if (isAtlas && isSelection) {
      printAtlasHelp();
    }
    throw err;
  }
}

module.exports = { connectDB };
