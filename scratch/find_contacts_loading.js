const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for setContacts or loadContacts in AppPromote.jsx:');
lines.forEach((line, idx) => {
  if (line.includes('setContacts(') || line.includes('loadContacts')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
