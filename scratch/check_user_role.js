const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { User } = require("../src/models/User");

async function checkUserRole() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    const user = await User.findOne({ name: /Vijay/i });
    if (user) {
      console.log("Found User:", user.name);
      console.log("Email:", user.email);
      console.log("Role in DB:", user.role);
    } else {
      console.log("No user found with name matching 'Vijay'.");
    }

    const allUsers = await User.find({});
    console.log("\nAll Users in DB:");
    allUsers.forEach(u => console.log(`- ${u.name} (${u.email}) -> Role: ${u.role}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkUserRole();
