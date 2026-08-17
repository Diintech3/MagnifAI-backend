const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '..', '..', 'Whats_AI_Integration_Postman_Collection (2).json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const findWabaSettingsRequest = (items) => {
  for (const item of items) {
    if (item.item) {
      findWabaSettingsRequest(item.item);
    } else if (item.request && item.request.url && item.request.url.raw && item.request.url.raw.includes('settings/waba')) {
      console.log('Found Request:', item.name);
      console.log('Method:', item.request.method);
      console.log('URL:', item.request.url.raw);
      if (item.request.body) {
        console.log('Body:', item.request.body.raw);
      }
    }
  }
};

findWabaSettingsRequest(collection.item);
