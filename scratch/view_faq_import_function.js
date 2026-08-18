const fs = require("fs");
const path = require("path");

const filePath = "d:/jan2026/magnifAi/frontend/src/pages/app/AppAiAgent.jsx";
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

console.log("Lines 1880-2050 in AppAiAgent.jsx:");
for (let i = 1879; i < 2050; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
