const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../../Whats_AI_Integration_Postman_Collection (2).json'), 'utf8');
const json = JSON.parse(content);

function listItems(items, prefix = '') {
  items.forEach(it => {
    if (it.item) {
      console.log(`${prefix}[Folder] ${it.name}`);
      listItems(it.item, prefix + '  ');
    } else if (it.request) {
      console.log(`${prefix} - ${it.name} (${it.request.method} ${it.request.url.raw || it.request.url})`);
    }
  });
}

listItems(json.item);
