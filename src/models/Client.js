const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

clientSchema.index({ appId: 1, name: 1 });

function toPublicClient(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
  };
}

const Client = mongoose.models.Client || mongoose.model("Client", clientSchema);

module.exports = { Client, toPublicClient };
