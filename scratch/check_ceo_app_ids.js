const mongoose = require("mongoose");

async function checkCeoAppIds() {
  const dbUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB.");

  const { CEO } = require("../src/models/CEO");
  const ceos = await CEO.find();
  console.log(`\nCEO App IDs list:`);
  ceos.forEach(ceo => {
    console.log(`- CEO Name: ${ceo.name}`);
    console.log(`  CEO ID: ${ceo._id}`);
    console.log(`  appId: ${ceo.appId}`);
  });

  await mongoose.disconnect();
}

checkCeoAppIds();
