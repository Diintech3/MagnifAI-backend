const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'appPortal.js');
let originalContent = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n for matching
let content = originalContent.replace(/\r\n/g, '\n');

// 1. Target block for getWhatsAiHeaders definition
const targetDef = `const getWhatsAiHeaders = async () => {
  const token = await getWhatsAiClientToken();
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  return {
    "Authorization": \`Bearer \${token}\`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };
};`;

const replacementDef = `const getWhatsAiHeaders = async (req) => {
  const token = await getWhatsAiClientToken();
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const headers = {
    "Authorization": \`Bearer \${token}\`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };
  if (req && req.user && req.user.role === "CEO") {
    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(req.user.sub);
    if (ceo && ceo.whatsAppClientId) {
      headers["x-client-id"] = ceo.whatsAppClientId;
    }
  }
  return headers;
};`;

if (!content.includes(targetDef)) {
  console.error("ERROR: Target definition of getWhatsAiHeaders not found in the file!");
  console.log("Checking index of substring:");
  const simpleMatch = "const getWhatsAiHeaders = async () => {";
  console.log("Match start line:", content.includes(simpleMatch));
  process.exit(1);
}

// Perform the definition replacement
content = content.replace(targetDef, replacementDef);

// 2. Perform the calls replacement
const originalCall = 'const headers = await getWhatsAiHeaders();';
const newCall = 'const headers = await getWhatsAiHeaders(req);';

let replaceCount = 0;
while (content.includes(originalCall)) {
  content = content.replace(originalCall, newCall);
  replaceCount++;
}

console.log(`Replaced definition successfully.`);
console.log(`Replaced ${replaceCount} calls to getWhatsAiHeaders().`);

// Restore original line endings if they were CRLF
if (originalContent.includes('\r\n')) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully.");
