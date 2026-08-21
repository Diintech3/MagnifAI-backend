const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Mongo connection URI for Whats AI
const whatsAiMongoUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  console.log("1. Checking MagnifAI Database...");
  await mongoose.connect(process.env.MONGODB_URI);
  const { CEO } = require("../src/models/CEO");
  
  // Find CEO with company "Asha Realty"
  const ceo = await CEO.findOne({ company: /Asha Realty/i });
  if (!ceo) {
    console.log("No CEO found with company 'Asha Realty' in MagnifAI!");
    await mongoose.disconnect();
    return;
  }

  console.log("\nMagnifAI CEO Account:");
  console.log({
    id: ceo._id,
    name: ceo.name,
    email: ceo.email,
    mobile: ceo.mobile,
    company: ceo.company,
    whatsAppClientId: ceo.whatsAppClientId,
    isWhatsAppConnected: ceo.isWhatsAppConnected
  });

  await mongoose.disconnect();

  console.log("\n2. Checking Whats AI Database...");
  const whatsAiConnection = await mongoose.createConnection(whatsAiMongoUri).asPromise();
  
  // Define User Schema for Whats AI
  const UserSchema = new mongoose.Schema({}, { strict: false });
  const WhatsAiUser = whatsAiConnection.model("User", UserSchema, "users");

  // Find user by email in Whats AI
  const waUser = await WhatsAiUser.findOne({ email: ceo.email.toLowerCase().trim() });
  if (!waUser) {
    console.log(`No user found with email '${ceo.email}' in Whats AI database!`);
  } else {
    console.log("\nWhats AI User Account details:");
    console.log(JSON.stringify(waUser.toObject(), null, 2));
  }

  await whatsAiConnection.close();
}

run();
