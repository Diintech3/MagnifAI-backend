const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const appPortalPath = path.resolve(__dirname, '../src/routes/appPortal.js');
const appPortalCode = fs.readFileSync(appPortalPath, 'utf8');

console.log('--- COMPARING ENDPOINTS IN APPPORTAL.JS VS WHATSAI POSTMAN COLLECTION ---');

// Find all occurrences of axios calls to apiBaseUrl in appPortal.js
const regex = /axios\.(get|post|put|patch|delete)\(\s*`\${apiBaseUrl\.replace\(\/\\\\\/\$, ""\)}([^`]+)`/g;
let match;
const foundCalls = [];
while ((match = regex.exec(appPortalCode)) !== null) {
  foundCalls.push({
    method: match[1].toUpperCase(),
    endpoint: match[2],
    index: match.index
  });
}

console.log(`Found ${foundCalls.length} WhatsAI calls in appPortal.js:`);
foundCalls.forEach(c => console.log(`- [${c.method}] ${c.endpoint}`));
