const fs = require("fs");
const path = require("path");

const filesToCheck = [
  "d:/jan2026/magnifAi/W-A-backend/debug_webhook.log",
  "d:/jan2026/magnifAi/W-A-backend/incoming_webhooks.log",
  "d:/jan2026/magnifAi/W-A-backend/controllers/debug_webhook.log",
  "d:/jan2026/magnifAi/W-A-backend/controllers/incoming_webhooks.log"
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`\n=== FOUND LOG FILE: ${file} ===`);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.trim().split("\n");
    console.log(`Last 20 lines:`);
    lines.slice(-20).forEach(line => console.log(line));
  } else {
    console.log(`File not found: ${file}`);
  }
});
