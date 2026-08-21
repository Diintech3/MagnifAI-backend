const wamid = "wamid.HBgMOTE4MDg0NjYxODEzFQIAERgSNTQxOEJFQ0EyM0NCM0IzNDUwAA==";
const parts = wamid.split(".");
if (parts[1]) {
  const buf = Buffer.from(parts[1], "base64");
  console.log("Hex representation:", buf.toString("hex"));
  console.log("String representation (ASCII/UTF8):", buf.toString("utf8"));
  console.log("Filtered printable chars:", buf.toString("utf8").replace(/[^\x20-\x7E]/g, ""));
}
