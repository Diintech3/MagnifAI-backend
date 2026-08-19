const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function checkConfig() {
  await mongoose.connect(process.env.MONGODB_URI);
  const CEO = mongoose.model("CEO", new mongoose.Schema({}, { strict: false }));
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  console.log("CEO WABA settings:");
  console.log("- whatsAppWabaId:", ceo.whatsAppWabaId);
  console.log("- whatsAppPhoneId:", ceo.whatsAppPhoneId);
  console.log("- isWhatsAppConnected:", ceo.isWhatsAppConnected);
  console.log("- whatsAppClientId:", ceo.whatsAppClientId);
  await mongoose.disconnect();
}

checkConfig().catch(console.error);
