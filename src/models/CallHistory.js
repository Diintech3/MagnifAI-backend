const mongoose = require("mongoose");

const callHistorySchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["user", "assistant"] },
    content: { type: String, required: true },
    file_url: { type: String, default: "" }
  },
  { 
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" } 
  }
);

const CallHistory = mongoose.models.CallHistory || mongoose.model("CallHistory", callHistorySchema);

module.exports = { CallHistory };
