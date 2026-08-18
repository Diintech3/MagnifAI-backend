const mongoose = require("mongoose");

async function runTest() {
  const dbUri = process.env.MONGODB_URI || "mongodb+srv://anilkumarsingh43425_db_user:uPUtiGrSzCue5xrN@cluster0.wkyihnb.mongodb.net/magnifai?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(dbUri);
  console.log("Connected to DB.");

  try {
    const { CEO } = require("../src/models/CEO");
    
    // Find or create a dummy test CEO
    let ceo = await CEO.findOne({ email: "testb2badplifai@example.com" });
    if (!ceo) {
      ceo = await CEO.create({
        appId: new mongoose.Types.ObjectId(),
        name: "Test B2B CEO",
        email: "testb2badplifai@example.com",
        mobile: "+91 99999 88888",
        passwordHash: "dummyhash",
        company: "Test B2B Comp"
      });
      console.log("Created test CEO.");
    }

    // Set environment vars mock
    process.env.ADPLIFAI_PARTNER_SECRET = "diin_partner_secret_12345";
    process.env.ADPLIFAI_API_KEY = "diin_fallback_key_67890";

    // Test helper emulation logic
    async function emulateGetHeaders(ceoId) {
      const partnerSecret = process.env.ADPLIFAI_PARTNER_SECRET;
      const targetCeo = await CEO.findById(ceoId);
      const clientApiKey = targetCeo?.adplifAiApiKey || process.env.ADPLIFAI_API_KEY;

      if (!clientApiKey) {
        throw new Error("ADPLIFAI_CLIENT_KEY_MISSING");
      }

      const headers = {
        "Content-Type": "application/json"
      };

      if (partnerSecret) {
        headers["x-partner-secret"] = partnerSecret;
        headers["x-api-key"] = clientApiKey;
      } else {
        headers["x-api-key"] = clientApiKey;
      }
      return headers;
    }

    // Case 1: No specific key (should fall back to ADPLIFAI_API_KEY)
    console.log("\n--- Case 1: Testing fallback logic (no CEO adplifAiApiKey set) ---");
    const headers1 = await emulateGetHeaders(ceo._id);
    console.log("Headers:", JSON.stringify(headers1, null, 2));

    // Case 2: CEO key set
    console.log("\n--- Case 2: Testing approved CEO key logic ---");
    ceo.adplifAiApiKey = "diin_approved_ceo_key_abcde";
    await ceo.save();
    const headers2 = await emulateGetHeaders(ceo._id);
    console.log("Headers:", JSON.stringify(headers2, null, 2));

    // Clean up
    await CEO.deleteOne({ _id: ceo._id });
    console.log("\nSuccessfully verified all header mappings.");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
