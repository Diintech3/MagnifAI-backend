const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CEO } = require('../src/models/CEO');

const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, index: true },
    ceoId: { type: mongoose.Schema.Types.ObjectId, ref: "CEO", required: true, index: true },
    status: { type: String, default: "completed" },
    sentCount: { type: Number, default: 0 },
    totalContacts: { type: Number, default: 0 },
    lastDispatchedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);
const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog || mongoose.model("WhatsAppCampaignLog", campaignLogSchema);

async function backfillSentCampaigns() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ceo = await CEO.findOne({ email: 'singhlakshmiraj@gmail.com' });

  const targetCampaignId = '6a84578e5bccf706d7b7dd37'; // "raaj ko api chahiye"
  await WhatsAppCampaignLog.findOneAndUpdate(
    { campaignId: targetCampaignId, ceoId: ceo._id },
    {
      status: 'completed',
      sentCount: 10,
      totalContacts: 10,
      lastDispatchedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log(`Saved WhatsAppCampaignLog for campaign ${targetCampaignId} as completed (10/10 sent)`);
  await mongoose.disconnect();
}

backfillSentCampaigns();
