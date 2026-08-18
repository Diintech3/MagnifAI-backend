const fs = require('fs');
const path = require('path');

const appPortalPath = path.resolve(__dirname, '../src/routes/appPortal.js');
const appPortalCode = fs.readFileSync(appPortalPath, 'utf8');

const collectionPath = path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Extract postman requests
function extractReqs(items) {
  let list = [];
  items.forEach(it => {
    if (it.item) list = list.concat(extractReqs(it.item));
    else {
      const url = typeof it.request.url === 'string' ? it.request.url : (it.request.url?.raw || '');
      list.push({ name: it.name, method: it.request.method, url, body: it.request.body?.raw });
    }
  });
  return list;
}

const postmanReqs = extractReqs(col.item);
console.log('--- POSTMAN REQUESTS ---');
postmanReqs.forEach(r => console.log(`[${r.method}] ${r.url} (${r.name})`));

// Find all router.[method]('/whatsapp/...') in appPortal.js
const lines = appPortalCode.split('\n');
console.log('\n--- APPPORTAL.JS WHATSAPP ROUTES ---');
lines.forEach((l, idx) => {
  if (l.includes('router.') && (l.includes('/whatsapp') || l.includes('getWhatsAiHeaders') || l.includes('getWhatsAiClientToken'))) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
