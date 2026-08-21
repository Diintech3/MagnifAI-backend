const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Group } = require("../src/models/Group");
const { Contact } = require("../src/models/Contact");
const { CEO } = require("../src/models/CEO");

const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, index: true },
    ceoId: { type: mongoose.Schema.Types.ObjectId, ref: "CEO", required: true, index: true },
    name: { type: String, trim: true },
    templateId: { type: String },
    templateName: { type: String },
    groupId: { type: String },
    groupName: { type: String },
    status: { type: String, default: "draft" },
    sentCount: { type: Number, default: 0 },
    totalContacts: { type: Number, default: 0 },
    scheduledAt: { type: Date },
    lastDispatchedAt: { type: Date },
    variablesMapping: { type: Object, default: {} }
  },
  { timestamps: true }
);
const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog || mongoose.model("WhatsAppCampaignLog", campaignLogSchema);

async function inspectData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB:", mongoose.connection.name);

    const ceos = await CEO.find({}, "name email whatsAppClientId isWhatsAppConnected");
    console.log("\n--- CEOs in DB ---");
    ceos.forEach(ceo => {
      console.log(`CEO ID: ${ceo._id}, Name: ${ceo.name}, Email: ${ceo.email}, whatsAppClientId: ${ceo.whatsAppClientId}, Connected: ${ceo.isWhatsAppConnected}`);
    });

    const groups = await Group.find({});
    console.log("\n--- Groups in DB ---");
    for (const group of groups) {
      console.log(`Group ID: ${group._id}, Name: ${group.name}, CEO ID: ${group.ceoId || 'None'}, Members Count: ${group.members?.length || 0}`);
      if (group.members && group.members.length > 0) {
        console.log("  Sample Member IDs:", group.members.slice(0, 5));
        const sampleContacts = await Contact.find({ _id: { $in: group.members } });
        console.log(`  Valid Contacts found in DB for group members: ${sampleContacts.length}`);
        sampleContacts.slice(0, 3).forEach(c => {
          console.log(`    - Name: ${c.name}, Phone: ${c.phone}`);
        });
      }
    }

    const campaignLogs = await WhatsAppCampaignLog.find({});
    console.log("\n--- WhatsApp Campaign Logs in DB ---");
    for (const log of campaignLogs) {
      console.log(`Log ID: ${log._id}, Campaign ID: ${log.campaignId}, Name: ${log.name}, Template: ${log.templateName}, Group ID: ${log.groupId}, Group Name: ${log.groupName}, Status: ${log.status}, Sent: ${log.sentCount}/${log.totalContacts}`);
    }

  } catch (err) {
    console.error("Error connecting or querying:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }
}

inspectData();
