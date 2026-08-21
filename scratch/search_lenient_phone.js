const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Contact } = require("../src/models/Contact");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Let's find all contacts containing "8084" or "1813" or "808"
  const contacts1 = await Contact.find({ phone: /808466/ });
  console.log("Found contacts with 808466:", contacts1.map(c => `${c.name} (${c.phone})`));

  const contacts2 = await Contact.find({ phone: /1813/ });
  console.log("Found contacts with 1813:", contacts2.map(c => `${c.name} (${c.phone})`));

  await mongoose.disconnect();
}

run();
