const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for contacts list rendering in AppPeople.jsx:');
let startPrinting = false;
let printedLines = 0;
lines.forEach((line, idx) => {
  if (line.includes('contacts.map') || line.includes('filteredContacts.map')) {
    startPrinting = true;
    console.log(`--- MATCH AT LINE ${idx + 1} ---`);
  }
  if (startPrinting) {
    console.log(`${idx + 1}: ${line.trim()}`);
    printedLines++;
    if (printedLines > 50) {
      startPrinting = false;
      printedLines = 0;
    }
  }
});
