const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { User } = require("../src/models/User");
const { CEO } = require("../src/models/CEO");
const { App } = require("../src/models/App");

async function findUserByD() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    console.log("--- Searching in USER Collection ---");
    const users = await User.find({ $or: [ { email: /^d/i }, { name: /^d/i } ] });
    users.forEach(u => console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`));

    console.log("--- Searching in CEO Collection ---");
    const ceos = await CEO.find({ $or: [ { email: /^d/i }, { name: /^d/i } ] });
    ceos.forEach(c => console.log(`CEO: ${c.name} | Email: ${c.email} | Active: ${c.isActive}`));

    console.log("--- Searching in APP Collection ---");
    const apps = await App.find({ $or: [ { email: /^d/i }, { businessName: /^d/i } ] });
    apps.forEach(a => console.log(`App: ${a.businessName} | Email: ${a.email} | Active: ${a.isActive}`));

    console.log("--- Printing All Active Users, CEOs and Apps ---");
    const allUsers = await User.find({});
    console.log("Users:");
    allUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) -> Role: ${u.role}`));
    
    const allCeos = await CEO.find({});
    console.log("CEOs:");
    allCeos.forEach(c => console.log(`  - ${c.name} (${c.email})`));

    const allApps = await App.find({});
    console.log("Apps:");
    allApps.forEach(a => console.log(`  - ${a.businessName} (${a.email})`));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

findUserByD();
