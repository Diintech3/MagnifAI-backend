require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");

// Generate token using Vijay's ID
const mockToken = jwt.sign(
  { sub: "6a2ae24eee131694db457a6f", role: "CEO" },
  process.env.JWT_SECRET
);

async function simulate() {
  try {
    console.log("Sending PUT request to running backend...");
    const res = await axios.put(
      "http://localhost:4000/api/personality/scripts/6a58956c8bf0453066e42ce0/status",
      { status: "Editing", note: "Trigger background AI editing on raw video." },
      {
        headers: {
          Authorization: `Bearer ${mockToken}`
        }
      }
    );
    console.log("Response Status:", res.status);
    console.log("Response Data:", res.data);
  } catch (err) {
    console.log("PUT request failed!");
    if (err.response) {
      console.log("Error Status:", err.response.status);
      console.log("Error Data:", err.response.data);
    } else {
      console.error("Error Message:", err.message);
    }
  }
}

simulate();
