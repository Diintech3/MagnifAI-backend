const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', '..', 'Whats_AI_Integration_Postman_Collection (2).json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const headers = new Set();

function extractHeaders(item) {
  if (item.request && item.request.header) {
    item.request.header.forEach(h => {
      headers.add(`${item.name} -> Header: ${h.key} = ${h.value}`);
    });
  }
  if (item.item) {
    item.item.forEach(extractHeaders);
  }
}

collection.item.forEach(extractHeaders);

console.log('All headers in Postman Collection:');
headers.forEach(h => console.log(h));
