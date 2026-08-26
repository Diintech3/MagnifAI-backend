const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Mock mongoose connect
const mongoose = require("mongoose");
mongoose.connect = async () => console.log("[Mock Mongoose] Connected");
mongoose.disconnect = async () => console.log("[Mock Mongoose] Disconnected");

// Mock CEO model
const { CEO } = require("../src/models/CEO");
const mockCeo = {
  _id: "60c72b2f9b1d8a2c88888888",
  ragClientId: "mock_client_id",
  ragToken: process.env.UGC_AI_APP_TOKEN,
  company: "Mock Company",
  name: "Mock Name"
};
CEO.findById = async () => mockCeo;
CEO.findOne = async () => mockCeo;

// Mock listSubUsers in agentAiService to return empty list to keep test simple
const agentAiService = require("../src/services/agentAiService");
const originalListSubUsers = agentAiService.listSubUsers;
agentAiService.listSubUsers = async () => ({ success: true, users: [] });

const { getPingStatsHandler } = require("../src/routes/calendar");

async function runTest() {
  const getReq = (period) => ({
    headers: {
      "x-app-token": process.env.UGC_AI_APP_TOKEN
    },
    query: { period }
  });

  const getRes = (period, expectedCount) => ({
    status(code) {
      return this;
    },
    json(data) {
      if (data && data.success) {
        const count = data.summary?.total_pings?.count;
        console.log(`[Test Period: ${period}] Expected: ${expectedCount}, Got: ${count}`);
        if (count === expectedCount) {
          console.log(`Assertion PASSED for ${period}!`);
        } else {
          console.error(`Assertion FAILED for ${period}!`);
          process.exit(1);
        }
      } else {
        console.error(`Test failed for ${period}:`, data);
        process.exit(1);
      }
      return this;
    }
  });

  console.log("Running ping statistics handler assertions...");
  try {
    // Assert 1: "this_week" should match 2 messages (sent on Aug 18)
    await getPingStatsHandler(getReq("this_week"), getRes("this_week", 2));

    // Assert 2: "today" should match 0 messages (as Aug 18 is not today)
    await getPingStatsHandler(getReq("today"), getRes("today", 0));

    console.log("\nAll assertions PASSED successfully! Code is correct.");
  } catch (err) {
    console.error("Error during execution:", err);
    process.exit(1);
  }
}

runTest();
