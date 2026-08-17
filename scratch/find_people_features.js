const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for AppPeople.jsx structure:');
lines.forEach((line, idx) => {
  if (line.includes('Save & Connect') || line.includes('Save') && line.includes('function') || line.includes('extractedDetails') || line.includes('delete') && line.includes('contact') || line.includes('OCR')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
