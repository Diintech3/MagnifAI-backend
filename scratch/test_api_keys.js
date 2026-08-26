const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
const { signAccessToken } = require("../src/utils/jwt");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:4000";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database");

  // Fetch a CEO to simulate
  const { CEO } = require("../src/models/CEO");
  const ceo = await CEO.findOne({ email: { $exists: true } });
  if (!ceo) {
    console.error("No CEO user found in database. Create a CEO first.");
    process.exit(1);
  }

  console.log(`Testing CEO: ${ceo.name} (${ceo.email})`);

  // Sign token for protected route access
  const token = signAccessToken({
    sub: ceo._id.toString(),
    appId: ceo.appId.toString(),
    email: ceo.email,
    role: "CEO",
    name: ceo.name,
  });

  const headers = { Authorization: `Bearer ${token}` };

  // 1. Generate new API key
  console.log("\n1. Generating new API key...");
  let res = await axios.post(`${BASE_URL}/api/client/key/generate`, {}, { headers });
  console.log("Response:", res.data);
  const activeKey = res.data.clientKey;

  // 2. Fetch current active key
  console.log("\n2. Fetching current active key...");
  res = await axios.get(`${BASE_URL}/api/client/key`, { headers });
  console.log("Response:", res.data);

  // 3. Login with API key (Public login endpoint)
  console.log("\n3. Testing login-with-key with generated key...");
  res = await axios.post(`${BASE_URL}/api/client/login-with-key`, { clientKey: activeKey });
  console.log("Login Response status success:", res.data.success);
  console.log("Client details:", res.data.client);
  console.log("Signed Token present:", !!res.data.token);

  // 4. Test YOVO connection using the mock key
  console.log("\n4. Testing /yovo/connect using the mock fallback key...");
  res = await axios.post(
    `${BASE_URL}/api/app/yovo/connect`,
    { clientKey: "mock_yovo_ai_client_key_for_local_testing_123" },
    { headers }
  );
  console.log("YOVO Connect Response:", res.data);

  // 5. Test YOVO disconnect
  console.log("\n5. Testing /yovo/disconnect...");
  res = await axios.post(`${BASE_URL}/api/app/yovo/disconnect`, {}, { headers });
  console.log("YOVO Disconnect Response:", res.data);

  // 6. Revoke key
  console.log("\n6. Revoking API key...");
  res = await axios.delete(`${BASE_URL}/api/client/key`, { headers });
  console.log("Revoke Response:", res.data);

  // 7. Verify login-with-key fails after revocation
  console.log("\n7. Verifying login-with-key fails for revoked key...");
  try {
    await axios.post(`${BASE_URL}/api/client/login-with-key`, { clientKey: activeKey });
  } catch (err) {
    console.log("Verified failure status:", err.response.status);
    console.log("Error details:", err.response.data);
  }

  await mongoose.disconnect();
  console.log("\nAll key management and login tests passed successfully!");
}

run().catch(e => {
  console.error("Test failed:", e.message);
  if (e.response) {
    console.error("Response details:", e.response.data);
  }
  mongoose.disconnect();
  process.exit(1);
});
