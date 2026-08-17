const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "../src/routes/appPortal.js"), "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("contacts") && line.includes("details")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    // print 20 lines after
    for (let i = 1; i <= 25; i++) {
      console.log(`  Line ${idx + 1 + i}: ${lines[idx + idx + i] ? lines[idx + i].trim() : ""}`);
    }
  }
});
