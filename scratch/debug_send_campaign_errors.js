const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

// Mongoose model for logs
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

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO not found.");
    process.exit(1);
  }

  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

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

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId,
    "Content-Type": "application/json"
  };

  const campaignId = "6a84762446805f30fa8d6d2c";
  
  // 1. Fetch Campaign
  const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignId}`, { headers });
  const campaign = cRes.data?.data?.campaign;
  console.log("Campaign template:", campaign.template);

  // 2. Fetch templates
  let templateName = "";
  let language = "en";
  let matchedTemplate = null;
  const tListRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/templates`, { headers });
  const tList = tListRes.data?.data?.templates || tListRes.data?.templates || [];
  matchedTemplate = tList.find(t => t._id === campaign.template || t.name === campaign.template || t.whatsappTemplateName === campaign.template);
  if (matchedTemplate) {
    templateName = matchedTemplate.whatsappTemplateName || matchedTemplate.name.toLowerCase().replace(/\s+/g, "_");
    language = (matchedTemplate.languageCode || matchedTemplate.language || "en").toLowerCase();
  }

  // 3. VariablesMapping fallback
  const rawVars = {
    "1": "Recipient Contact Name",
    "2": "Lakshmi Raj Singh"
  };

  console.log("Using rawVars:", rawVars);

  // Recipient: Hirdesh Nawani (919953100111)
  const phone = "919953100111";
  const contactName = "HIRDESH NAWANI";
  let digits = phone.replace(/[^0-9]/g, "");
  digits = digits.replace(/^0+/, "");
  let formattedPhone = `91${digits.slice(-10)}`;

  const variablesArray = [];
  Object.keys(rawVars).forEach(k => {
    let v = rawVars[k];
    if (v === "{{contact.name}}" || v === "Recipient Contact Name") {
      v = contactName;
    } else if (v === "{{ceo.name}}" || v === "Lakshmi Raj Singh") {
      v = ceo.name || "Lakshmi Raj Singh";
    }
    variablesArray.push({ key: String(k), value: String(v) });
  });

  console.log(`Sending to ${formattedPhone} with variables:`, JSON.stringify(variablesArray));

  try {
    const res = await axios.post(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`, {
      phone: formattedPhone,
      templateName,
      language,
      variables: variablesArray
    }, { headers });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.error("FAILED:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Error data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
