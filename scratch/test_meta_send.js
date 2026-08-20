const axios = require("axios");

// Stored CEO credentials in MongoDB
const PHONE_ID = "790783224112773";
const TOKEN = "EAAPQNJxvtoUBPNypMjlWt2ShbI29bhUN9J9yPKbu0ZBPiXdBdKlv8PeOzYa0iKne1YR27G0VJjlZBkDQIZA7ZBQEZCZC4nfEqENFv9fyQkB0ZCs2EdkeZCaoJLoxzl3MbEVukk2y7UQgt3Tl7psZBWZBsSKRrPZCIxO4ZAQCPDvwxZBnYe2CbUDaStcW212O9xbZBmzooVtAZDZD";
const TO_PHONE = "917970906978";

async function run() {
  const url = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;
  console.log("Sending direct test request to Meta Graph API at URL:", url);

  const payload = {
    messaging_product: "whatsapp",
    to: TO_PHONE,
    type: "template",
    template: {
      name: "festival_greetings",
      language: { code: "hi" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Anand" },
            { type: "text", text: "Diwali" }
          ]
        }
      ]
    }
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    console.log("Success Response from Meta:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("Meta API Error Details:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Network Error:", err.message);
    }
  }
}

run();
