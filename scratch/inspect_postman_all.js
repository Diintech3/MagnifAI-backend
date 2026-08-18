const fs = require('fs');
const path = require('path');

const postmanPath = path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json');
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

function extractRequests(items, prefix = '') {
  const list = [];
  items.forEach(item => {
    if (item.item) {
      list.push(...extractRequests(item.item, `${prefix}${item.name} > `));
    } else if (item.request) {
      list.push({
        folder: prefix,
        name: item.name,
        method: item.request.method,
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw,
        body: item.request.body?.raw || item.request.body
      });
    }
  });
  return list;
}

const allReqs = extractRequests(postman.item || []);
console.log(`Total Requests in Postman Collection: ${allReqs.length}\n`);
allReqs.forEach((r, i) => {
  console.log(`${i + 1}. [${r.method}] ${r.folder}${r.name}`);
  console.log(`   URL: ${r.url}`);
  if (r.body) {
    console.log(`   Body: ${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`);
  }
});
