const axios = require("axios");
const FormData = require("form-data");

async function testWithFormData() {
  const apiKey = "eWpqODFvNW1kbHA2YnloaGVlNmVqOkhwdVAyd01lNjB0NDZzYkM4d0loUjR0TXBvV2JVMjhI";
  const url = "https://api.va.landing.ai/v1/ade/parse";

  const form = new FormData();
  form.append("document_url", "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800"); // A valid card-like or portrait image
  form.append("model", "dpt-2-latest");

  try {
    console.log("Sending request as multipart/form-data...");
    const response = await axios.post(
      url,
      form,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          ...form.getHeaders()
        }
      }
    );
    console.log("SUCCESS! Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.log("FAILED, status:", err.response ? err.response.status : err.message);
    if (err.response) {
      console.log("Error details:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

testWithFormData();
