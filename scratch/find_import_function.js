const fs = require("fs");
const path = require("path");

const filePath = "d:/jan2026/magnifAi/frontend/src/pages/app/AppAiAgent.jsx";
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

console.log("Searching for handleBulkImportFaq:");
let startIndex = -1;
lines.forEach((line, index) => {
  if (line.includes("handleBulkImportFaq")) {
    console.log(`Found handleBulkImportFaq at line ${index + 1}`);
    startIndex = index;
  }
});

if (startIndex !== -1) {
  console.log("\nViewing handleBulkImportFaq implementation:");
  for (let i = startIndex - 5; i < startIndex + 150; i++) {
    if (lines[i] !== undefined) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
}
