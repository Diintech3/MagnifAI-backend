const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for card parsing functions in AppPeople.jsx:');
lines.forEach((line, idx) => {
  if (line.includes('parseCard') || line.includes('cardPreviewUrl') || line.includes('upload') && idx < 400) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
