const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");
const { Campaign } = require("../src/models/Campaign");

// Mongoose Models for logs
const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true },
    ceoId: { type: mongoose.Schema.Types.ObjectId, ref: "CEO" },
    groupId: { type: String },
    groupName: { type: String }
  },
  { strict: false }
);
const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog || mongoose.model("WhatsAppCampaignLog", campaignLogSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Database connected successfully.");

  // Get active CEO
  const ceo = await CEO.findOne({ whatsAppClientId: { $exists: true, $ne: null } });
  if (!ceo) {
    console.error("No CEO found with a configured whatsAppClientId.");
    process.exit(1);
  }
  console.log(`Using CEO: ${ceo.name} (${ceo.email}), Client ID: ${ceo.whatsAppClientId}`);

  // Perform API sharing handshake
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  console.log("Handshake inputs:", { apiBaseUrl, partnerKey, clientToken: Boolean(clientToken), ref, apiKey });

  const handshakeRes = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    {
      apiSharingKey: partnerKey,
      accessToken: clientToken,
      referenceKey: ref
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    }
  );

  const token = handshakeRes.data?.token || handshakeRes.data?.data?.token || handshakeRes.data?.data?.accessToken || handshakeRes.data?.accessToken;
  if (!token) {
    console.error("Failed to authenticate with Whats AI.");
    process.exit(1);
  }
  console.log("Handshake successful. Token retrieved.");

  // Headers with and without client-id
  const headersWithClientId = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId,
    "Content-Type": "application/json"
  };

  const headersWithoutClientId = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  console.log("\n--- Testing Fetch Groups ---");
  try {
    const groupsRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`, { headers: headersWithClientId });
    const groups = groupsRes.data?.data?.groups || groupsRes.data?.groups || [];
    console.log(`Groups (with client ID) Count: ${groups.length}`);
    if (groups.length > 0) {
      console.log("First Group Sample:", JSON.stringify(groups[0], null, 2));
    }
  } catch (err) {
    console.error("Error fetching groups:", err.response?.data || err.message);
  }

  console.log("\n--- Testing Fetch Contacts WITH x-client-id ---");
  let contactsWith = [];
  try {
    const contactsRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts`, { headers: headersWithClientId });
    contactsWith = contactsRes.data?.data?.contacts || contactsRes.data?.contacts || [];
    console.log(`Contacts (with client ID) Count: ${contactsWith.length}`);
    if (contactsWith.length > 0) {
      console.log("First Contact Sample (with Client ID):", JSON.stringify(contactsWith[0], null, 2));
      const groupAssociations = contactsWith.map(c => ({ name: c.name, phone: c.phone, group: c.group }));
      console.log("Contact group properties sample:", groupAssociations.slice(0, 5));
    }
  } catch (err) {
    console.error("Error fetching contacts with client id:", err.response?.data || err.message);
  }

  console.log("\n--- Testing Fetch Contacts WITHOUT x-client-id (Master Headers) ---");
  let contactsWithout = [];
  try {
    const contactsRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/contacts`, { headers: headersWithoutClientId });
    contactsWithout = contactsRes.data?.data?.contacts || contactsRes.data?.contacts || [];
    console.log(`Contacts (without client ID) Count: ${contactsWithout.length}`);
    if (contactsWithout.length > 0) {
      console.log("First Contact Sample (without Client ID):", JSON.stringify(contactsWithout[0], null, 2));
    }
  } catch (err) {
    console.error("Error fetching contacts without client id:", err.response?.data || err.message);
  }

  // Let's also check the actual campaign logs database for sent metrics
  console.log("\n--- Testing Campaign Logs in Local DB ---");
  const logs = await WhatsAppCampaignLog.find({ ceoId: ceo._id }).limit(5);
  console.log("Local Campaign Logs in DB:", JSON.stringify(logs, null, 2));

  process.exit(0);
}

run().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
