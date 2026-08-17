const fs = require('fs');
const path = require('path');

const collectionPath = 'd:\\jan2026\\magnifAi\\Whats_AI_Integration_Postman_Collection (2).json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const findAgentRequests = (items) => {
  for (const item of items) {
    if (item.item) {
      findAgentRequests(item.item);
    } else if (item.request && (item.name.includes('AI Agent') || item.name.includes('AI agent'))) {
      console.log(`\n=== Request: ${item.name} ===`);
      console.log(`Method: ${item.request.method}`);
      console.log(`URL Object:`, JSON.stringify(item.request.url, null, 2));
      if (item.request.body) {
        console.log(`Body Content: ${item.request.body.raw}`);
      }
    }
  }
};

findAgentRequests(collection.item);
