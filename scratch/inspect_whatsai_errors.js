const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model("Message", schema, "messages");

    const failedMessages = await Message.find({ status: "failed" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log("\n--- Recent Failed Messages from Meta in Whats AI ---");
    failedMessages.forEach((m, idx) => {
      console.log(`\n${idx + 1}. To: ${m.to}`);
      console.log(`   Template/Body: ${m.body}`);
      console.log(`   ErrorReason: ${m.errorReason}`);
      console.log(`   ErrorDetails:`, JSON.stringify(m.errorDetails || m.error_details || m.error || 'None', null, 2));
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
