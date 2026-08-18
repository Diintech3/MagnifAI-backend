const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json'), 'utf8');
const json = JSON.parse(content);

const contactsFolder = json.item.find(i => i.name.includes('Contacts & Groups'));
console.log('Contacts & Groups Requests:');
contactsFolder.item.forEach(req => {
  console.log(`\n--- ${req.name} (${req.request.method} ${req.request.url.raw}) ---`);
  if (req.request.body && req.request.body.raw) {
    console.log('Body:', req.request.body.raw);
  }
});
