const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model("Message", schema, "messages");

    const failedWithReason = await Message.find({
      status: "failed",
      errorReason: { $exists: true, $ne: "" }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`\n--- Failed Messages with Reason (Found ${failedWithReason.length}) ---`);
    failedWithReason.forEach((m, idx) => {
      console.log(`\n${idx + 1}. To: ${m.to}`);
      console.log(`   Template: ${m.body}`);
      console.log(`   Reason: ${m.errorReason}`);
      console.log(`   Details:`, JSON.stringify(m.errorDetails || m.error_details || m.error || 'None', null, 2));
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
