const mongoose = require("mongoose");

async function checkRagTokens() {
  const dbUri = "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to MongoDB.");

  const { CEO } = require("../src/models/CEO");
  const ceos = await CEO.find();
  console.log(`\nCEO List with RAG tokens:`);
  ceos.forEach(ceo => {
    console.log(`- Name: ${ceo.name}`);
    console.log(`  ID: ${ceo._id}`);
    console.log(`  ragToken: ${ceo.ragToken ? ceo.ragToken.substring(0, 10) + "..." : "undefined"}`);
    console.log(`  mobile: ${ceo.mobile}`);
  });

  await mongoose.disconnect();
}

checkRagTokens();
