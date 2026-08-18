const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

console.log('--- ALL REQUESTS IN COLLECTION ---');
function extractReqs(items, folder = '') {
  let list = [];
  items.forEach(it => {
    if (it.item) {
      list = list.concat(extractReqs(it.item, folder ? `${folder} > ${it.name}` : it.name));
    } else {
      list.push({
        folder,
        name: it.name,
        method: it.request.method,
        url: typeof it.request.url === 'string' ? it.request.url : (it.request.url ? it.request.url.raw : ''),
        headers: (it.request.header || []).map(h => `${h.key}: ${h.value}${h.disabled ? ' (disabled)' : ''}`),
        body: it.request.body ? it.request.body.raw : null
      });
    }
  });
  return list;
}

const reqs = extractReqs(col.item);
reqs.forEach((r, idx) => {
  console.log(`\n[${idx + 1}] [${r.folder}] ${r.name}`);
  console.log(`    ${r.method} ${r.url}`);
  console.log(`    Headers: ${r.headers.join(' | ')}`);
  if (r.body) console.log(`    Body: ${r.body.trim()}`);
});
