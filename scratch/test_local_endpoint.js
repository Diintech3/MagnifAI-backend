const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function run() {
  const token = process.env.UGC_AI_APP_TOKEN;
  console.log("Calling local endpoint with x-app-token:", token ? token.substring(0, 10) + "..." : "undefined");
  try {
    const res = await axios.get("http://localhost:4000/api/root-agent/pings/stats?period=all", {
      headers: {
        "x-app-token": token
      },
      timeout: 15000 // 15 seconds timeout
    });
    console.log("\n=================== LOCAL API RESPONSE ===================");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("\nError calling local API:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
  }
}

run();
