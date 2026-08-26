const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { getVisitorSessions } = require("../src/services/agentAiService");

async function checkSessionTimestamps() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    const token = ceo.ragToken || env.UGC_AI_APP_TOKEN;
    const agentId = "61cacd3104a8612e"; // Vijay's AI Assistant

    console.log("Using token:", token);
    const sessions = await getVisitorSessions(agentId, token);
    console.log(`Total sessions returned: ${sessions.length}`);

    sessions.forEach((sess, i) => {
      console.log(`[Sess ${i+1}] ID: ${sess.session_id}, platform: ${sess.platform}, role: ${sess.role}, device_name: ${sess.device_name}`);
      console.log(`  created_at: ${sess.created_at}`);
      console.log(`  updated_at: ${sess.updated_at}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error checking session timestamps:", err);
  }
}

checkSessionTimestamps();
