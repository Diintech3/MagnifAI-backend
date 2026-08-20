const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/whatsapp-automation?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to whatsapp-automation DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", schema, "users");

    // Update Lakshami Raj Singh's whatsappWabaId to the correct value
    const result = await User.updateOne(
      { email: "singhlakshmiraj@gmail.com" },
      { $set: { whatsappWabaId: "1107299854127673" } }
    );

    console.log("Update result:", result);

    const updatedUser = await User.findOne({ email: "singhlakshmiraj@gmail.com" }).lean();
    console.log("Updated User in DB:", JSON.stringify(updatedUser, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
