const express = require("express");
const axios = require("axios");
const { CEO } = require("../models/CEO");
const { CallSession } = require("../models/CallSession");
const { CallHistory } = require("../models/CallHistory");

const telephonyRouter = express.Router();

// Helper function to match inbound call dialed number to active agents
async function matchAgent(To) {
  const cleanTo = String(To).replace(/[^0-9]/g, "");
  const last10To = cleanTo.slice(-10);
  const ceos = await CEO.find({ ragToken: { $exists: true, $ne: "" } });

  for (const ceo of ceos) {
    try {
      const baseUrl = process.env.UGC_AI_BASE_URL.replace(/\/$/, "");
      const res = await axios.get(`${baseUrl}/api/agents`, {
        headers: { "X-App-Token": ceo.ragToken }
      });
      const agents = res.data || [];
      for (const ag of agents) {
        // Rule 1: Direct phone_number match
        const cleanPhone = String(ag.phone_number || "").replace(/[^0-9]/g, "");
        if (cleanPhone && cleanPhone === cleanTo) return { agent: ag, ceo };

        // Rule 2: Suffix match (last 10 digits)
        if (cleanPhone.length >= 10 && cleanPhone.slice(-10) === last10To) return { agent: ag, ceo };

        // Rule 3: Customization JSON Match
        const customPhone = String(ag.customization?.call_number || "").replace(/[^0-9]/g, "");
        if (customPhone && customPhone === cleanTo) return { agent: ag, ceo };
        if (customPhone.length >= 10 && customPhone.slice(-10) === last10To) return { agent: ag, ceo };
      }
    } catch (e) {
      console.error(`Error fetching agents for CEO ${ceo.email}:`, e.message);
    }
  }
  return null;
}

// 1. Webhook Endpoint: POST /api/telephony/inbound-call
telephonyRouter.post("/inbound-call", async (req, res) => {
  const { From, To, CallSid } = req.body;
  console.log(`[inbound-call-webhook] Received call from ${From} to ${To} (CallSid: ${CallSid})`);

  if (!To || !From) {
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>Sorry, call parameters are missing.</Play>
        <Hangup />
      </Response>
    `);
  }

  // Matching logic
  const match = await matchAgent(To);
  if (!match) {
    console.log(`[inbound-call-webhook] No agent matched for dialed number: ${To}`);
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>Sorry, no active agent is configured for this phone number.</Play>
        <Hangup />
      </Response>
    `);
  }

  const { agent, ceo } = match;
  const session_id = CallSid || `tel_${Date.now()}`;
  console.log(`[inbound-call-webhook] Matched Agent: ${agent.name} (ID: ${agent.agent_id || agent.id})`);

  // Check if manual call forwarding is enabled
  if (ceo.telephonyMode === "manual") {
    const targetMobile = ceo.mobile || "+919876543210";
    console.log(`[inbound-call-webhook] Manual routing active. Forwarding call to: ${targetMobile}`);
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Dial>${targetMobile}</Dial>
      </Response>
    `);
  }

  try {
    // Create Call Session in local DB
    await CallSession.create({
      session_id,
      agent_id: agent.agent_id || agent.id,
      device_id: From,
      device_name: "Voice Call",
      user_name: `Caller ${From.slice(-4)}`,
      phone_number: From,
      analysis: {
        intent: "Incoming query call",
        summary: "Customer connected to the voice assistant."
      },
      status: "active"
    });

    // Create Call History turn
    const welcomeText = `Namaskar! ${agent.name} me aapka swagat hai. Main aapki kya madad kar sakta hoon?`;
    await CallHistory.create({
      session_id,
      role: "assistant",
      content: welcomeText
    });

    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>${welcomeText}</Play>
        <Record action="/api/telephony/inbound-call/recording?session_id=${session_id}" method="POST" maxLength="60" />
      </Response>
    `);
  } catch (err) {
    console.error("[inbound-call-webhook-error]", err.message);
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>Server error initializing call session.</Play>
        <Hangup />
      </Response>
    `);
  }
});

// 2. Webhook Recording Endpoint: POST /api/telephony/inbound-call/recording
telephonyRouter.post("/inbound-call/recording", async (req, res) => {
  const { session_id } = req.query;
  const { RecordingUrl, SpeechResult } = req.body;
  console.log(`[inbound-call-recording] Received recording for session ${session_id}. Speech: ${SpeechResult}`);

  try {
    if (SpeechResult) {
      await CallHistory.create({
        session_id,
        role: "user",
        content: SpeechResult,
        file_url: RecordingUrl || ""
      });
    }

    const reply = "Dhanyawad! Aapka sandesh record kar liya gaya hai. Hum aapse jald hi sampark karenge.";
    await CallHistory.create({
      session_id,
      role: "assistant",
      content: reply
    });

    // Mark session as completed
    await CallSession.findOneAndUpdate({ session_id }, { status: "completed" });

    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>${reply}</Play>
        <Hangup />
      </Response>
    `);
  } catch (err) {
    console.error("[inbound-call-recording-error]", err.message);
    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Play>Thank you for calling.</Play>
        <Hangup />
      </Response>
    `);
  }
});

const { requireAuth, requireRole } = require("../middleware/auth");

// 3. Update Telephony Mode Configuration: PUT /api/telephony/mode
telephonyRouter.put("/mode", requireAuth, requireRole("CEO"), async (req, res) => {
  try {
    const { mode } = req.body;
    if (mode !== "auto" && mode !== "manual") {
      return res.status(400).json({ error: "INVALID_MODE", message: "Mode must be 'auto' or 'manual'" });
    }

    const ceo = await CEO.findByIdAndUpdate(
      req.user.sub,
      { telephonyMode: mode },
      { new: true }
    );

    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    return res.json({ success: true, telephonyMode: ceo.telephonyMode });
  } catch (err) {
    return res.status(500).json({ error: "UPDATE_MODE_FAILED", message: err.message });
  }
});

module.exports = { telephonyRouter };
