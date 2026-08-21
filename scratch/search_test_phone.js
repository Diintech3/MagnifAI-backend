const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Contact } = require("../src/models/Contact");
const { CEO } = require("../src/models/CEO");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const testPhones = ["918084661813", "8084661813", "8084"];
  for (const num of testPhones) {
    const contact = await Contact.findOne({ phone: new RegExp(num) });
    console.log(`Searching Contact for "${num}":`, contact ? `${contact.name} (${contact.phone})` : "Not Found");
    const ceo = await CEO.findOne({ mobile: new RegExp(num) });
    console.log(`Searching CEO for "${num}":`, ceo ? `${ceo.name} (${ceo.mobile})` : "Not Found");
  }

  await mongoose.disconnect();
}

run();
