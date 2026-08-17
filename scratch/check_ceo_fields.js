const mongoose = require("mongoose");

async function checkCeoFields() {
  const dbUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB.");

  const { CEO } = require("../src/models/CEO");
  const ceo = await CEO.findOne({ name: /Vijay/i });
  if (ceo) {
    console.log("\nVijay CEO Document Fields:");
    console.log(JSON.stringify(ceo.toObject(), null, 2));
  } else {
    console.log("Vijay CEO not found.");
  }

  const lakshamiCeo = await CEO.findOne({ name: /Lakshami/i });
  if (lakshamiCeo) {
    console.log("\nLakshami CEO Document Fields:");
    console.log(JSON.stringify(lakshamiCeo.toObject(), null, 2));
  } else {
    console.log("Lakshami CEO not found.");
  }

  await mongoose.disconnect();
}

checkCeoFields();
