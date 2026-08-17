const axios = require("axios");
const FormData = require("form-data");

async function debugOCR() {
  const apiKey = "eWpqODFvNW1kbHA2YnloaGVlNmVqOkhwdVAyd01lNjB0NDZzYkM4d0loUjR0TXBvV2JVMjhI";
  
  // A mock business card image URL
  const imageUrl = "https://templates.rapidosoft.com/business-card/business-card-demo.jpg";
  
  try {
    console.log("Downloading mock business card...");
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageResponse.data);

    // 1. Parse API
    console.log("1. Calling Parse API...");
    const parseForm = new FormData();
    parseForm.append("document", buffer, {
      filename: "card.jpg",
      contentType: "image/jpeg"
    });
    parseForm.append("model", "dpt-2-latest");

    const parseResponse = await axios.post("https://api.va.landing.ai/v1/ade/parse", parseForm, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...parseForm.getHeaders()
      }
    });

    const markdown = parseResponse.data.markdown;
    console.log("\n--- RAW MARKDOWN ---");
    console.log(markdown);
    console.log("--------------------\n");

    // 2. Extract API with Union Types ["string", "null"]
    console.log("2. Calling Extract API with type: ['string', 'null']...");
    const extractForm1 = new FormData();
    extractForm1.append("markdown", markdown);
    
    const schema1 = {
      type: "object",
      properties: {
        name: { type: ["string", "null"], description: "The full name of the business person" },
        phone: { type: ["string", "null"], description: "The phone number or mobile number" }
      }
    };
    extractForm1.append("schema", JSON.stringify(schema1));
    extractForm1.append("model", "extract-latest");

    const response1 = await axios.post("https://api.va.landing.ai/v1/ade/extract", extractForm1, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...extractForm1.getHeaders()
      }
    });
    console.log("Response with union types:", JSON.stringify(response1.data, null, 2));

    // 3. Extract API with Type: "string" (Single Type)
    console.log("\n3. Calling Extract API with type: 'string'...");
    const extractForm2 = new FormData();
    extractForm2.append("markdown", markdown);
    
    const schema2 = {
      type: "object",
      properties: {
        name: { type: "string", description: "The full name of the business person" },
        phone: { type: "string", description: "The phone number or mobile number" },
        email: { type: "string", description: "The email address" },
        company: { type: "string", description: "The company name" },
        designation: { type: "string", description: "The designation or job title of the person" }
      }
    };
    extractForm2.append("schema", JSON.stringify(schema2));
    extractForm2.append("model", "extract-latest");

    const response2 = await axios.post("https://api.va.landing.ai/v1/ade/extract", extractForm2, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...extractForm2.getHeaders()
      }
    });
    console.log("Response with type string:", JSON.stringify(response2.data, null, 2));

  } catch (err) {
    console.error("Error occurred:");
    if (err.response) {
      console.error(err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

debugOCR();
