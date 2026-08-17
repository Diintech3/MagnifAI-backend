const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");

async function restorePassword() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB.");
    const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
    if (ceo) {
      ceo.passwordHash = "$2b$12$FoXoqmqtkGjFcSmXd6N52.JPZVAiLjFntmRZcTvmG86zINnRv8bOO";
      await ceo.save();
      console.log("SUCCESS: Original password hash restored!");
    } else {
      console.log("ERROR: CEO not found.");
    }
  } catch (err) {
    console.error("Failed to restore password:", err);
  } finally {
    await mongoose.disconnect();
  }
}
restorePassword();
