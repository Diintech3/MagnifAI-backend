const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "..", "Whats_AI_Integration_Postman_Collection (2).json");
const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

function searchItems(items) {
  for (const item of items) {
    if (item.item) {
      searchItems(item.item);
    } else if (item.request) {
      const url = item.request.url;
      const urlString = typeof url === "string" ? url : (url.raw || "");
      if (urlString.includes("conversations") || urlString.includes("read") || urlString.includes("resolve")) {
        console.log(`Name: ${item.name}`);
        console.log(`Method: ${item.request.method}`);
        console.log(`URL: ${urlString}`);
        console.log("------------------------");
      }
    }
  }
}

if (content.item) {
  searchItems(content.item);
}
