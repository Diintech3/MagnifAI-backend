const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for templates reference in render/JSX:');
lines.forEach((line, idx) => {
  if (line.includes('templates.map') || line.includes('templates') && idx > 600) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
