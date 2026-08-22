const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function runLocalTelephonyTest() {
  try {
    // 1. Connect to DB to check data
    const dbUri = process.env.MONGODB_URI;
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB.");

    const { CEO } = require("../src/models/CEO");
    const { CallSession } = require("../src/models/CallSession");
    const { CallHistory } = require("../src/models/CallHistory");

    // Fetch Vijay to get his agentId
    const vijay = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    if (!vijay) {
      console.error("Vijay CEO not found in DB!");
      await mongoose.disconnect();
      return;
    }
    console.log(`Vijay Agent ID: ${vijay.agentId}`);

    // Clean any old test records for this agent to keep database clean
    await CallSession.deleteMany({ agent_id: vijay.agentId });
    await CallHistory.deleteMany({});
    console.log("Cleaned old test sessions and history.");

    // Force Auto mode first
    vijay.telephonyMode = "auto";
    await vijay.save();
    console.log("Set Vijay telephonyMode to 'auto'.");

    const serverUrl = "http://localhost:4000";
    const testCallSid = `tel_test_sid_${Date.now()}`;

    // 2. Simulate Vobiz carrier inbound-call webhook call to Vijay's number (918065354041) (AUTO Mode)
    console.log("\n--- Simulating Incoming Call Webhook [AUTO Mode] (POST /api/telephony/inbound-call) ---");
    const webhookRes = await axios.post(`${serverUrl}/api/telephony/inbound-call`, {
      From: "+919876543210",
      To: "918065354041",
      CallSid: testCallSid
    });
    console.log("Webhook Response Status:", webhookRes.status);
    console.log("Webhook VXML Response Body:\n", webhookRes.data);

    // Verify session was created in DB
    const session = await CallSession.findOne({ session_id: testCallSid });
    if (session) {
      console.log(`\n[SUCCESS] CallSession created in MongoDB. Session ID: ${session.session_id}, Agent ID: ${session.agent_id}`);
    } else {
      console.error("[FAILURE] CallSession was not created in MongoDB!");
    }

    // 2.5. Switch to MANUAL Mode and verify forwarding VXML
    console.log("\n--- Switching to MANUAL Mode ---");
    vijay.telephonyMode = "manual";
    await vijay.save();
    
    const manualCallSid = `tel_manual_sid_${Date.now()}`;
    console.log("Simulating Incoming Call Webhook [MANUAL Mode] (POST /api/telephony/inbound-call) ---");
    const manualRes = await axios.post(`${serverUrl}/api/telephony/inbound-call`, {
      From: "+919876543210",
      To: "918065354041",
      CallSid: manualCallSid
    });
    console.log("Manual Webhook Response Status:", manualRes.status);
    console.log("Manual Webhook VXML Response Body:\n", manualRes.data);
    if (manualRes.data.includes("<Dial>") && manualRes.data.includes(vijay.mobile)) {
      console.log("[SUCCESS] Webhook correctly returned Dial command for call forwarding.");
    } else {
      console.error("[FAILURE] Webhook did not return correct Dial command for call forwarding!");
    }

    // 3. Simulate Vobiz recording webhook when user speaks
    console.log("\n--- Simulating User Speech Recording Webhook (POST /api/telephony/inbound-call/recording) ---");
    const recordRes = await axios.post(`${serverUrl}/api/telephony/inbound-call/recording?session_id=${testCallSid}`, {
      RecordingUrl: "https://magnifai.in/assets/test_recording.mp3",
      SpeechResult: "Hello Vijay, can we schedule a meeting tomorrow?"
    });
    console.log("Recording Webhook VXML Response:\n", recordRes.data);

    // Verify history turns were created in DB
    const turns = await CallHistory.find({ session_id: testCallSid }).sort({ created_at: 1 });
    console.log(`\nTotal conversation turns created in MongoDB: ${turns.length}`);
    turns.forEach((t, i) => {
      console.log(`  [Turn ${i+1}] Role: ${t.role} | Content: ${t.content} | Recording: ${t.file_url || "None"}`);
    });

    // 4. Verify client logs API endpoint (GET /api/agents/:agent_id/sessions)
    console.log("\n--- Verifying GET /api/agents/:agent_id/sessions ---");
    // Generate temporary auth token for local validation
    const { signAccessToken } = require("../src/utils/jwt");
    const token = signAccessToken({ sub: vijay._id.toString(), appId: vijay.appId.toString(), role: "CEO" });

    const sessionsRes = await axios.get(`${serverUrl}/api/agents/${vijay.agentId}/sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Sessions endpoint returned:", sessionsRes.data.length, "sessions.");
    if (sessionsRes.data.length > 0) {
      console.log("First session ID from API:", sessionsRes.data[0].session_id);
    }

    // 5. Verify history API endpoint (GET /api/agents/sessions/:session_id/history)
    console.log("\n--- Verifying GET /api/agents/sessions/:session_id/history ---");
    const historyRes = await axios.get(`${serverUrl}/api/agents/sessions/${testCallSid}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("History endpoint returned:", historyRes.data.length, "dialogue turns.");

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB. Local Telephony Test Finished successfully.");
  } catch (err) {
    console.error("Test failed:", err.response ? err.response.data : err.message);
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

runLocalTelephonyTest();
