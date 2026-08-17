const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for handleSaveScannedContact or similar save functions:');
lines.forEach((line, idx) => {
  if (line.includes('SaveScannedContact') || line.includes('Save') && line.includes('Scanned') || line.includes('handleSave') || line.includes('save') && idx < 600) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
