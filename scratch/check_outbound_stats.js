const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const Message = mongoose.model("Message", schema, "messages");

    const totalOutbound = await Message.countDocuments({ direction: "outbound" });
    const failedOutbound = await Message.countDocuments({ direction: "outbound", status: "failed" });
    const deliveredOutbound = await Message.countDocuments({ direction: "outbound", status: "delivered" });
    const readOutbound = await Message.countDocuments({ direction: "outbound", status: "read" });
    const sentOutbound = await Message.countDocuments({ direction: "outbound", status: "sent" });

    console.log("Outbound stats:", {
      total: totalOutbound,
      failed: failedOutbound,
      delivered: deliveredOutbound,
      read: readOutbound,
      sent: sentOutbound
    });

    // Let's print the last 3 delivered/read messages if any
    const delivered = await Message.find({ direction: "outbound", status: { $in: ["delivered", "read"] } })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    console.log("Delivered/Read sample:", JSON.stringify(delivered, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
