const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

console.log('Collection Name:', col.info.name);
console.log('Variables:');
col.variable.forEach(v => console.log(`  ${v.key} = ${v.value}`));

function printItems(items, prefix = '') {
  items.forEach(it => {
    if (it.item) {
      console.log(prefix + '📁 ' + it.name);
      printItems(it.item, prefix + '  ');
    } else {
      const req = it.request;
      const url = typeof req.url === 'string' ? req.url : (req.url ? req.url.raw : '');
      const headers = (req.header || []).map(h => `${h.key}: ${h.value}${h.disabled ? ' (DISABLED)' : ''}`).join(', ');
      console.log(`${prefix}➡️ [${req.method}] ${it.name} -> ${url}`);
      if (headers) console.log(`${prefix}   Headers: ${headers}`);
      if (req.body && req.body.raw) {
        console.log(`${prefix}   Body: ${req.body.raw.replace(/\n\s*/g, ' ')}`);
      }
    }
  });
}

printItems(col.item);
