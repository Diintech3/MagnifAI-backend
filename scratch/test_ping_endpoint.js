const { getPingStatsHandler } = require("../src/routes/calendar");
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { CEO } = require("../src/models/CEO");

async function testPingEndpoint() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected successfully!");

    const ceo = await CEO.findOne({ email: "vijay.wiz@gmail.com" });
    if (!ceo) {
      console.error("CEO not found!");
      await mongoose.disconnect();
      return;
    }

    // Mock request object mimicking authenticated CEO request for period "this_week"
    const req = {
      headers: {
        authorization: "Bearer mock_token_ignored_since_we_set_user"
      },
      query: {
        period: "this_week"
      },
      user: {
        sub: ceo._id.toString(),
        role: "CEO"
      }
    };

    // Mock response object
    const res = {
      status(code) {
        console.log(`[res.status] ${code}`);
        return this;
      },
      json(data) {
        console.log("\n=================== API RESPONSE ===================");
        console.log(JSON.stringify(data, null, 2));
        console.log("====================================================");
        return this;
      }
    };

    console.log("Invoking getPingStatsHandler...");
    await getPingStatsHandler(req, res);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testPingEndpoint();
