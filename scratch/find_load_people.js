const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'app', 'AppPeople.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Search results for fetch/loading logic:');
lines.forEach((line, idx) => {
  if (line.includes('loadPeople') || line.includes('setBusinessCards') || line.includes('contactType') || line.includes('api("/api/app/people/contacts"')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
