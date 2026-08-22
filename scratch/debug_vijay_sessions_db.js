const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function checkVijaySessionsWithRealToken() {
  try {
    const dbUri = process.env.MONGODB_URI;
    await mongoose.connect(dbUri);
    
    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    if (!ceo) {
      console.error("Vijay CEO profile not found in MongoDB!");
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Using real token from MongoDB for ${ceo.name}:`);
    console.log(`Token: ${ceo.ragToken}`);
    
    const baseUrl = process.env.UGC_AI_BASE_URL.replace(/\/$/, "");
    console.log(`Fetching sessions from Vectorize for agent ${ceo.agentId}...`);
    
    const res = await axios.get(`${baseUrl}/api/agents/${ceo.agentId}/sessions`, {
      headers: { "X-App-Token": ceo.ragToken }
    });
    
    const sessions = res.data || [];
    console.log(`Vectorize returned ${sessions.length} total sessions.`);
    
    if (sessions.length > 0) {
      console.log("\nSample session IDs:");
      sessions.slice(0, 10).forEach((s, i) => {
        console.log(`  [${i+1}] ID: ${s.session_id} | Device: ${s.device_name} | User: ${s.user_name}`);
      });
      
      const telephony = sessions.filter(s => s.session_id?.startsWith("tel_") || s.device_name === "Voice Call");
      console.log(`\nTelephony (Voice Call) sessions count: ${telephony.length}`);
      if (telephony.length > 0) {
        telephony.forEach((s, i) => {
          console.log(`  [Voice Call ${i+1}] ID: ${s.session_id} | Caller: ${s.phone_number}`);
        });
      }
    } else {
      console.log("No sessions returned by Vectorize for Vijay's agent.");
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Request failed:", err.response ? err.response.data : err.message);
    try { await mongoose.disconnect(); } catch(e) {}
  }
}

checkVijaySessionsWithRealToken();
