const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function testLocalFileUpload() {
  const apiKey = "eWpqODFvNW1kbHA2YnloaGVlNmVqOkhwdVAyd01lNjB0NDZzYkM4d0loUjR0TXBvV2JVMjhI";
  const filePath = path.join(__dirname, "../../frontend/public/MagnifAI logo.jpeg");

  if (!fs.existsSync(filePath)) {
    console.error("Local file does not exist at:", filePath);
    return;
  }

  // 1. Step 1: Parse the local document
  const parseUrl = "https://api.va.landing.ai/v1/ade/parse";
  const parseForm = new FormData();
  parseForm.append("document", fs.createReadStream(filePath));
  parseForm.append("model", "dpt-2-latest");

  try {
    console.log("1. Parsing local business card image via document upload...");
    const parseResponse = await axios.post(parseUrl, parseForm, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...parseForm.getHeaders()
      }
    });

    const markdown = parseResponse.data.markdown;
    console.log("SUCCESS! Parsed Markdown content length:", markdown.length);
    console.log("Markdown Content:", markdown);

    // 2. Step 2: Extract structured fields from markdown
    const extractUrl = "https://api.va.landing.ai/v1/ade/extract";
    const extractForm = new FormData();
    extractForm.append("markdown", markdown);
    
    // Define the schema of fields we want to extract
    const schema = {
      type: "object",
      properties: {
        company: { type: "string", description: "The company name or brand name shown on the logo or card" },
        text: { type: "string", description: "Any other visible text" }
      }
    };
    
    extractForm.append("schema", JSON.stringify(schema));
    extractForm.append("model", "extract-latest");

    console.log("2. Extracting fields via schema...");
    const extractResponse = await axios.post(extractUrl, extractForm, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...extractForm.getHeaders()
      }
    });

    console.log("SUCCESS! Extracted Data:", JSON.stringify(extractResponse.data, null, 2));

  } catch (err) {
    console.log("FAILED, status:", err.response ? err.response.status : err.message);
    if (err.response) {
      console.log("Error details:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

testLocalFileUpload();
