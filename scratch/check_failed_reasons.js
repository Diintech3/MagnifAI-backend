const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model("Message", schema, "messages");

    const failedWithReason = await Message.find({
      direction: "outbound",
      errorReason: { $exists: true, $ne: "" }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log("Failed messages with reason:", JSON.stringify(failedWithReason, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
