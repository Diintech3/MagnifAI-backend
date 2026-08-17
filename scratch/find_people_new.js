const fs = require("fs");
const path = require("path");

function searchDir(dir, term) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, term);
    } else if (file.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes(term)) {
        console.log(`Found in file: ${fullPath}`);
        // print matching lines
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (line.includes(term)) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(path.join(__dirname, "../src"), "people/new");
