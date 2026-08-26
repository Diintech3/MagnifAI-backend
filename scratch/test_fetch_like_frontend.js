const axios = require("axios");
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");

async function testFetch() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    const token = ceo.ragToken || env.UGC_AI_APP_TOKEN;
    await mongoose.disconnect();

    const periods = ["today", "yesterday", "this_week", "all"];
    
    for (const p of periods) {
      console.log(`\nFetching with period=${p}...`);
      const url = `http://localhost:4000/api/root-agent/pings/stats?period=${p}`;
      try {
        const res = await axios.get(url, {
          headers: {
            "x-app-token": token
          }
        });
        console.log("Success!");
        console.log("Total Pings:", res.data.summary.total_pings);
        console.log("Conversations:", res.data.summary.conversations);
      } catch (err) {
        console.error("Failed:", err.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

testFetch();
