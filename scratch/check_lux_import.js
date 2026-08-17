const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPromote.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Icon imports in AppPromote.jsx (lines 1 to 20):');
for (let i = 0; i < 20; i++) {
  if (lines[i].includes('react-icons/lu') || lines[i].includes('Lu')) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}
