const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

const token = jwt.sign({
  sub: "6a65df76ba9914893a35508f",
  appId: "6a1ab0ea2af329ff8732de0b",
  email: "singhlakshmiraj@gmail.com",
  role: "CEO",
  name: "Lakshami Raj Singh"
}, secret, { expiresIn: "1h" });

async function testCampaignDispatch() {
  console.log("=== 1. Create Festival Campaign with 2 variables ===");
  const createRes = await axios.post("http://localhost:4000/api/app/whatsapp/campaigns", {
    name: "Festival Automated Test",
    template: "6a68f26f86feedf812fa6a67", // Festival Greetings
    templateName: "Festival Greetings",
    targetGroup: "6a82d07424d0dbb08e022ac7", // Akkash
    groupName: "Akkash",
    variablesMapping: {
      "1": "{{contact.name}}",
      "2": "दीपावली"
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Create Campaign Response:", createRes.data);
  const campaignId = createRes.data.campaignId || createRes.data.data?.campaignId || createRes.data.data?.campaign?._id;

  console.log(`\n=== 2. Send Campaign ${campaignId} ===`);
  const sendRes = await axios.post(`http://localhost:4000/api/app/whatsapp/campaigns/${campaignId}/send`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Send Campaign Response:", sendRes.data);
}

testCampaignDispatch().catch(e => console.error("Error:", e.response?.data || e.message));
