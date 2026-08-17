const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for campaigns history table rendering:');
let startPrinting = false;
let printedLines = 0;

lines.forEach((line, idx) => {
  if (line.includes('Campaigns History') || line.includes('waCampaigns.map')) {
    startPrinting = true;
    console.log(`--- MATCH AT LINE ${idx + 1} ---`);
  }
  if (startPrinting) {
    console.log(`${idx + 1}: ${line.trim()}`);
    printedLines++;
    if (printedLines > 80) {
      startPrinting = false;
      printedLines = 0;
    }
  }
});
