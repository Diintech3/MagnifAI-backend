const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "d:/jan2026/magnifAi/backend/.env" });

const { CEO } = require("../src/models/CEO");

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
  console.log("Connected to database.");

  const ceo = await CEO.findOne({ email: "singhlakshmiraj@gmail.com" });
  if (!ceo) {
    console.error("CEO singhlakshmiraj@gmail.com not found.");
    process.exit(1);
  }
  console.log(`CEO: ${ceo.name}, Client ID: ${ceo.whatsAppClientId}`);

  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  // Login handshake
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
    console.error("Handshake failed.");
    process.exit(1);
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "x-client-id": ceo.whatsAppClientId,
    "Content-Type": "application/json"
  };

  // Find a completed campaign log with sentCount 0
  const campaignLog = await WhatsAppCampaignLog.findOne({ ceoId: ceo._id, campaignId: "6a84762446805f30fa8d6d2c" });
  if (!campaignLog) {
    console.error("Campaign log not found.");
    process.exit(1);
  }
  console.log("Campaign Log details:", {
    campaignId: campaignLog.campaignId,
    name: campaignLog.name,
    templateId: campaignLog.templateId,
    templateName: campaignLog.templateName,
    groupId: campaignLog.groupId,
    status: campaignLog.status,
    totalContacts: campaignLog.totalContacts,
    sentCount: campaignLog.sentCount
  });

  // Fetch campaign details from Whats AI
  console.log("\nFetching campaign details from Whats AI...");
  const cRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${campaignLog.campaignId}`, { headers });
  const campaign = cRes.data?.data?.campaign;
  if (!campaign) {
    console.error("Campaign not found on Whats AI.");
    process.exit(1);
  }
  console.log("Whats AI Campaign Details:", JSON.stringify(campaign, null, 2));

  // Fetch template details from Whats AI
  console.log("\nFetching template details from Whats AI...");
  let templateName = "";
  let language = "en";
  let matchedTemplate = null;
  try {
    const tListRes = await axios.get(`${apiBaseUrl.replace(/\/$/, "")}/api/templates`, { headers });
    const tList = tListRes.data?.data?.templates || tListRes.data?.templates || [];
    matchedTemplate = tList.find(t => t._id === campaign.template || t.name === campaign.template || t.whatsappTemplateName === campaign.template);
    if (matchedTemplate) {
      templateName = matchedTemplate.whatsappTemplateName || matchedTemplate.name.toLowerCase().replace(/\s+/g, "_");
      language = (matchedTemplate.languageCode || matchedTemplate.language || "en").toLowerCase();
    }
  } catch (e) {
    console.warn("Could not fetch templates:", e.message);
  }

  if (!templateName) {
    templateName = (campaign.template || "ai_assistant").toLowerCase().replace(/\s+/g, "_");
  }
  console.log("Resolved template details:", { templateName, language, hasMatchedTemplate: Boolean(matchedTemplate) });

  // Fetch contacts using master headers (as done in send route)
  const masterHeaders = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };

  console.log("\nFetching contacts from Whats AI...");
  const contactsRes = await axios.get(
    `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
    { headers: masterHeaders }
  );
  const allContacts = contactsRes.data?.data?.contacts || contactsRes.data?.contacts || [];

  const targetContacts = allContacts.filter(c => {
    const groupArr = Array.isArray(c.group) ? c.group : [c.group].filter(Boolean);
    return groupArr.some(g => {
      const gid = (g._id || g.id || g || "").toString();
      return gid === campaign.targetGroup;
    });
  });

  console.log(`Filtered target contacts count: ${targetContacts.length}`);
  if (targetContacts.length === 0) {
    console.log("No contacts in target group using master headers!");
    process.exit(0);
  }

  // Let's test sending for the first contact
  const contact = targetContacts[0];
  const rawPhone = contact.phone || contact.customerPhone || "";
  let digits = String(rawPhone).replace(/[^0-9]/g, "");
  digits = digits.replace(/^0+/, "");
  
  let formattedPhone = "";
  if (digits.length === 10) {
    formattedPhone = `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    formattedPhone = digits;
  } else if (digits.length > 10) {
    formattedPhone = digits;
  }

  console.log(`Testing send for contact: ${contact.name} (${rawPhone}) -> Formatted Phone: ${formattedPhone}`);

  const rawVars = campaign.variablesMapping || campaignLog.variablesMapping || {};
  const variablesArray = [];
  Object.keys(rawVars).forEach(k => {
    let v = rawVars[k];
    if (v === "{{contact.name}}" || v === "Recipient Contact Name") {
      v = contact.name || "Customer";
    } else if (v === "{{ceo.name}}" || v === "Lakshmi Raj Singh") {
      v = ceo.name || "Lakshmi Raj Singh";
    }
    variablesArray.push({ key: String(k), value: String(v) });
  });

  if (matchedTemplate && Array.isArray(matchedTemplate.sampleParams) && matchedTemplate.sampleParams.length > 0) {
    matchedTemplate.sampleParams.forEach(sp => {
      const keyStr = String(sp.key || "");
      if (keyStr && !variablesArray.find(va => va.key === keyStr)) {
        let val = sp.value || "";
        if (keyStr === "1") val = contact.name || "Customer";
        else if (keyStr === "2") val = ceo.name || "Lakshmi Raj Singh";
        variablesArray.push({ key: keyStr, value: String(val) });
      }
    });
  }

  if (variablesArray.length === 0) {
    variablesArray.push({ key: "1", value: contact.name || "Customer" });
  }

  console.log("Variables mapping payload:", JSON.stringify(variablesArray));

  try {
    const sendRes = await axios.post(`${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`, {
      phone: formattedPhone,
      templateName,
      language,
      variables: variablesArray
    }, { headers });
    console.log("Send template response:", sendRes.data);
  } catch (err) {
    console.error("Error sending template message:");
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Response data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
