const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { App } = require("../src/models/App");
const { User } = require("../src/models/User");

async function checkAnandMohan() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    const searchEmail = "anandmoha.7970@gmail.com";
    console.log(`Searching for '${searchEmail}' across all collections...`);

    const user = await User.findOne({ email: searchEmail });
    console.log("In User collection:", user ? JSON.stringify(user) : "Not Found");

    const app = await App.findOne({ email: searchEmail });
    console.log("In App collection:", app ? JSON.stringify(app) : "Not Found");

    const ceo = await CEO.findOne({ email: searchEmail });
    console.log("In CEO collection:", ceo ? JSON.stringify(ceo) : "Not Found");

    const anyAnandUser = await User.findOne({ name: /Anand/i });
    console.log("Any user with name Anand:", anyAnandUser ? JSON.stringify(anyAnandUser) : "None");

    const anyAnandCeo = await CEO.findOne({ name: /Anand/i });
    console.log("Any CEO with name Anand:", anyAnandCeo ? JSON.stringify(anyAnandCeo) : "None");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkAnandMohan();
