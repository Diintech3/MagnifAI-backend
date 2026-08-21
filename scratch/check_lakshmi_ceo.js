const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  console.log("Lakshami Raj Singh CEO doc:", JSON.stringify(ceo, null, 2));

  await mongoose.disconnect();
}

run();
