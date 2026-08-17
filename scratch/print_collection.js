const fs = require('fs');
const path = require('path');

const collectionPath = 'd:\\jan2026\\magnifAi\\Whats_AI_Integration_Postman_Collection (2).json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const printFolderContents = (folder) => {
  console.log(`\n=== Folder: ${folder.name} ===`);
  (folder.item || []).forEach(item => {
    if (item.request) {
      console.log(`- Request: ${item.name}`);
      console.log(`  Method: ${item.request.method}`);
      console.log(`  URL: ${item.request.url.raw || (item.request.url.path ? item.request.url.path.join('/') : '')}`);
      if (item.request.body && item.request.body.raw) {
        console.log(`  Body: ${item.request.body.raw.substring(0, 300)}`);
      }
    } else {
      printFolderContents(item);
    }
  });
};

printFolderContents(collection);
