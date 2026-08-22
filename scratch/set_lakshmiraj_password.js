const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { hashPassword } = require("../src/utils/password");

async function setPassword() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB.");
    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    if (ceo) {
      ceo.passwordHash = await hashPassword("singhlakshmiraj@3210");
      await ceo.save();
      console.log("SUCCESS: Password updated successfully to 'singhlakshmiraj@3210'!");
    } else {
      console.log("ERROR: CEO not found.");
    }
  } catch (err) {
    console.error("Failed to update password:", err);
  } finally {
    await mongoose.disconnect();
  }
}
setPassword();
