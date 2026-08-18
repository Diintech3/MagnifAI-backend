const fs = require("fs");
const path = require("path");

const filePath = "d:/jan2026/magnifAi/frontend/src/pages/app/AppAiAgent.jsx";
if (!fs.existsSync(filePath)) {
  console.log("File does not exist at:", filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n");

console.log("Searching for Q&A parsing keywords in AppAiAgent.jsx:");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("import") || line.toLowerCase().includes("parse") || line.toLowerCase().includes("regex") || line.toLowerCase().includes("replace(")) {
    // Only print if it looks relevant to Q&A or FAQ
    if (line.includes("faq") || line.includes("q&a") || line.includes("question") || line.includes("answer") || line.includes("clean") || line.includes("split")) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
