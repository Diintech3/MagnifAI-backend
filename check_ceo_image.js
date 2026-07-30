const path = require("path");
const mongoose = require("mongoose");
const { CEO } = require("./src/models/CEO");
const { App } = require("./src/models/App");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");
  const ceos = await CEO.find({});
  console.log("--- CEOS ---");
  ceos.forEach(c => {
    console.log(`CEO ID: ${c._id}, Name: ${c.name}, Avatar: ${c.avatarUrl || c.avatar}`);
  });

  const apps = await App.find({});
  console.log("--- APPS ---");
  apps.forEach(a => {
    console.log(`App ID: ${a._id}, Name: ${a.businessName}, Logo: ${a.logoUrl}`);
  });
  mongoose.disconnect();
}

run().catch(console.error);
