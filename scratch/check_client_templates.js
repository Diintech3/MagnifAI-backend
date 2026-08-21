const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Mongo connection URI for Whats AI
const whatsAiMongoUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  console.log("Connecting to Whats AI Database...");
  const whatsAiConnection = await mongoose.createConnection(whatsAiMongoUri).asPromise();
  
  // Define Schemas for Whats AI
  const UserSchema = new mongoose.Schema({}, { strict: false });
  const WhatsAiUser = whatsAiConnection.model("User", UserSchema, "users");

  const TemplateSchema = new mongoose.Schema({}, { strict: false });
  const WhatsAiTemplate = whatsAiConnection.model("Template", TemplateSchema, "templates");

  // 1. Find client
  const email = "singhlakshmiraj@gmail.com";
  const user = await WhatsAiUser.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.log(`No user found with email '${email}' in Whats AI!`);
    await whatsAiConnection.close();
    return;
  }

  console.log(`Found User: ${user.name} (ID: ${user._id})`);

  // 2. Find templates for this user
  // On Whats AI, are templates linked via userId or client/user reference? Let's check templates where userId is this client ID.
  const templates = await WhatsAiTemplate.find({ userId: user._id.toString() });
  console.log(`\nTemplates found by userId (string): ${templates.length}`);

  const templatesByObjectId = await WhatsAiTemplate.find({ userId: user._id });
  console.log(`Templates found by userId (ObjectId): ${templatesByObjectId.length}`);

  const templatesByUser = await WhatsAiTemplate.find({ user: user._id });
  console.log(`Templates found by user (ObjectId): ${templatesByUser.length}`);

  // Let's print the first few templates in the collection generally to see their link key
  const sampleTemplates = await WhatsAiTemplate.find({}).limit(5);
  console.log("\nSample templates in DB (to check linking keys):");
  sampleTemplates.forEach(t => {
    console.log({
      _id: t._id,
      name: t.name || t.whatsappTemplateName,
      userId: t.userId,
      user: t.user,
      status: t.status
    });
  });

  await whatsAiConnection.close();
}

run();
