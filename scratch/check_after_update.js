const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model("Message", schema, "messages");

    const afterUpdate = await Message.find({
      direction: "outbound",
      createdAt: { $gt: new Date("2026-08-19T15:52:39.948Z") }
    }).lean();

    console.log(`Outbound messages after update: ${afterUpdate.length}`);
    console.log("Statuses breakdown:");
    const breakdown = {};
    afterUpdate.forEach(m => {
      breakdown[m.status] = (breakdown[m.status] || 0) + 1;
    });
    console.log(breakdown);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
