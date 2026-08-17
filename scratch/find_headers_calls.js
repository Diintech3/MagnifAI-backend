const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'appPortal.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Lines containing getWhatsAiHeaders:');
lines.forEach((line, idx) => {
  if (line.includes('getWhatsAiHeaders')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
