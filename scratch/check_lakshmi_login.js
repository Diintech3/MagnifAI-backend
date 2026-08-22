const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { verifyPassword } = require("../src/utils/password");

async function checkLakshmi() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB!");

    const email = "singhlakshmiraj@gmail.com";
    const ceo = await CEO.findOne({ email });
    if (!ceo) {
      console.log(`CEO with email ${email} not found!`);
      await mongoose.disconnect();
      return;
    }

    console.log(`\nCEO Details:`);
    console.log(`Name:         ${ceo.name}`);
    console.log(`Email:        ${ceo.email}`);
    console.log(`Active:       ${ceo.isActive}`);
    console.log(`PasswordHash: ${ceo.passwordHash}`);

    // Let's test standard passwords
    const testPasswords = ["tempPassword123!", "123456", "password", "vijaywiz@123", "superadmin@123"];
    for (const pass of testPasswords) {
      const ok = await verifyPassword(pass, ceo.passwordHash);
      console.log(`Password "${pass}": ${ok ? 'VALID ✅' : 'INVALID ❌'}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkLakshmi();
