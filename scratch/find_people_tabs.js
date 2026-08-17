const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for peopleTab checks:');
lines.forEach((line, idx) => {
  if (line.includes('peopleTab ===')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
