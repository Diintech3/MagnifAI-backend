const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for isWhatsAppConnected or isWhatsAppConfigured:');
lines.forEach((line, idx) => {
  if (line.includes('isWhatsAppConnected') || line.includes('isWhatsAppConfigured') || line.includes('whatsAppConnected') || line.includes('whatsAppConfigured')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
