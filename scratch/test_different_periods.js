const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");
const { getPingStatsHandler } = require("../src/routes/calendar");

async function testPeriods() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    if (!ceo) {
      console.error("CEO not found!");
      await mongoose.disconnect();
      return;
    }

    const periods = ["today", "yesterday", "this_week", "all"];

    for (const p of periods) {
      console.log(`\n=================== TESTING PERIOD: ${p} ===================`);
      const req = {
        headers: { authorization: "Bearer mock" },
        query: { period: p },
        user: { sub: ceo._id.toString(), role: "CEO" }
      };

      let responseData = null;
      const res = {
        status(code) { return this; },
        json(data) {
          responseData = data;
          return this;
        }
      };

      await getPingStatsHandler(req, res);
      
      console.log("Total Pings:", responseData.summary.total_pings);
      console.log("Conversations:", responseData.summary.conversations);
      console.log("Sources:", responseData.summary.sources);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testPeriods();
