const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "App",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    iconIndex: {
      type: Number,
      default: 0,
    },
    colorHex: {
      type: String,
      default: "#FFD54F",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
  },
  { timestamps: true }
);

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

module.exports = { Group };
