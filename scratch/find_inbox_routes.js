const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "routes", "appPortal.js");
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

console.log("Searching for 'inbox' in appPortal.js:");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("inbox")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
