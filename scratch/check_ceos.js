const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to magnifai DB");

    const schema = new mongoose.Schema({}, { strict: false });
    const CEO = mongoose.model("CEO", schema, "ceos");

    const ceos = await CEO.find({})
      .lean();

    console.log("CEOs configuration:", JSON.stringify(ceos, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
