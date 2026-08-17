const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Icon imports in AppPeople.jsx:');
lines.forEach((line, idx) => {
  if (line.includes('react-icons/lu')) {
    // print surrounding lines
    for (let i = Math.max(0, idx - 15); i <= Math.min(lines.length - 1, idx); i++) {
      console.log(`${i + 1}: ${lines[i].trim()}`);
    }
  }
});
