const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Template = mongoose.model("Template", schema, "templates");

    const t = await Template.findOne({ whatsappTemplateName: "festival_greetings" }).lean();
    if (t) {
      console.log("Template 'festival_greetings' found in Whats AI DB:");
      console.log(JSON.stringify(t, null, 2));
    } else {
      console.log("Template 'festival_greetings' not found!");
      const all = await Template.find({}).limit(5).lean();
      console.log("Sample templates:", all.map(item => `${item.whatsappTemplateName} (${item.languageCode || item.language})`));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
