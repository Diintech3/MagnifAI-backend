const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

// Schema for logs
const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true },
    ceoId: { type: mongoose.Schema.Types.ObjectId, ref: "CEO" }
  },
  { strict: false }
);
const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog || mongoose.model("WhatsAppCampaignLog", campaignLogSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database.");

  // Get active CEO
  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO singhlakshmiraj@gmail.com not found.");
    process.exit(1);
  }

  // Generate JWT token
  const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";
  const token = jwt.sign(
    {
      sub: ceo._id.toString(),
      role: "CEO",
      email: ceo.email
    },
    secret,
    { expiresIn: "1h" }
  );

  console.log(`Generated JWT Token for CEO: ${ceo.name}`);

  // Trigger campaign send with variablesMapping in the request body
  const campaignId = "6a84762446805f30fa8d6d2c";
  const url = `http://localhost:4000/api/app/whatsapp/campaigns/${campaignId}/send`;

  console.log(`Triggering HTTP POST request to: ${url}`);
  try {
    const res = await axios.post(
      url,
      {
        variablesMapping: {
          "1": "Recipient Contact Name",
          "2": "Lakshmi Raj Singh"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log("Response from server:", res.data);

    console.log("Waiting 6 seconds for background dispatch to execute...");
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Verify database status
    const log = await WhatsAppCampaignLog.findOne({ campaignId, ceoId: ceo._id });
    console.log("\n--- Verification Result ---");
    console.log("Database Log Status:", {
      status: log?.status,
      totalContacts: log?.totalContacts,
      sentCount: log?.sentCount,
      lastDispatchedAt: log?.lastDispatchedAt
    });
  } catch (err) {
    console.error("HTTP Request Failed:");
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Response data:", err.response.data);
    } else {
      console.error(err.message);
    }
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
