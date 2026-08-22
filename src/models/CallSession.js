const mongoose = require("mongoose");

const callSessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    agent_id: { type: String, required: true, index: true },
    device_id: { type: String, required: true },
    device_name: { type: String, default: "Voice Call" },
    user_name: { type: String, default: "Anonymous Visitor" },
    phone_number: { type: String, required: true },
    analysis: {
      intent: { type: String, default: "" },
      summary: { type: String, default: "" }
    },
    status: { type: String, default: "completed", enum: ["active", "completed"] }
  },
  { 
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" } 
  }
);

const CallSession = mongoose.models.CallSession || mongoose.model("CallSession", callSessionSchema);

module.exports = { CallSession };
