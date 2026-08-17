const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function inspectContacts() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log("Connected to Magnifi AI database!");

    const { Contact } = require("../src/models/Contact");
    
    // Find unique contact types
    const contactTypes = await Contact.distinct("contactType");
    console.log("\nDistinct Contact Types in DB:", contactTypes);

    // Find unique categories
    const categories = await Contact.distinct("category");
    console.log("Distinct Categories in DB:", categories);

    // Get count of contacts per type
    for (const type of contactTypes) {
      const count = await Contact.countDocuments({ contactType: type });
      console.log(`- Count of type '${type}': ${count}`);
    }

    // Get sample of business contact
    const businessSample = await Contact.findOne({ contactType: "business" });
    if (businessSample) {
      console.log("\nSample Business Contact:");
      console.log(JSON.stringify(businessSample, null, 2));
    } else {
      console.log("\nNo contact with type 'business' found.");
    }

    // Print a few regular contacts
    const regularSample = await Contact.findOne({ contactType: "regular" });
    if (regularSample) {
      console.log("\nSample Regular Contact:");
      console.log(JSON.stringify(regularSample, null, 2));
    }

  } catch (err) {
    console.error("Failed to inspect contacts:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }
}

inspectContacts();
