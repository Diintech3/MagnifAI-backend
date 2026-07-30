const express = require("express");
const { isR2Configured, getObjectFromR2 } = require("../utils/r2");

const router = express.Router();

function normalizeKey(raw) {
  if (!raw) return null;
  const key = Array.isArray(raw) ? raw.join("/") : String(raw);
  const decoded = decodeURIComponent(key).replace(/^\/+/, "");
  if (
    !decoded.startsWith("apps/logos/") &&
    !decoded.startsWith("candidates/") &&
    !decoded.startsWith("posts/media/") &&
    !decoded.startsWith("ceos/") &&
    !decoded.startsWith("content/images/") &&
    !decoded.startsWith("scripts/images/") &&
    !decoded.startsWith("scripts/videos/") &&
    !decoded.startsWith("agents/images/")
  ) return null;
  return decoded;
}

async function serveLogo(req, res, key) {
  if (!key) return res.status(400).json({ error: "INVALID_KEY" });
  if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });

  try {
    const object = await getObjectFromR2(key);
    res.setHeader("Content-Type", object.ContentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (object.Body?.pipe) {
      object.Body.pipe(res);
      return;
    }
    const bytes = await object.Body.transformToByteArray();
    return res.send(Buffer.from(bytes));
  } catch (err) {
    console.error("[public/logo]", key, err?.message || err);
    return res.status(404).json({ error: "NOT_FOUND" });
  }
}

router.get("/logo", (req, res) => serveLogo(req, res, normalizeKey(req.query.key)));

router.get("/logos/{*key}", (req, res) => serveLogo(req, res, normalizeKey(`apps/logos/${req.params.key}`)));

router.get("/posts/{*key}", (req, res) => serveLogo(req, res, normalizeKey(`posts/media/${req.params.key}`)));

// Image Proxy to bypass Instagram / Facebook hotlinking protection
router.get("/image-proxy", async (req, res) => {
  let imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: "URL_REQUIRED" });

  // Decode from Base64 if needed (obfuscates tracking keywords from adblockers)
  if (imageUrl.startsWith("b64_")) {
    try {
      imageUrl = Buffer.from(imageUrl.substring(4), "base64").toString("utf-8");
    } catch (e) {
      return res.status(400).json({ error: "INVALID_BASE64" });
    }
  } else if (!imageUrl.startsWith("http")) {
    try {
      imageUrl = Buffer.from(imageUrl, "base64").toString("utf-8");
    } catch (e) {
      return res.status(400).json({ error: "INVALID_URL" });
    }
  }

  try {
    const parsed = new URL(imageUrl);
    const allowedHostSuffixes = [
      ".cdninstagram.com",
      ".fbcdn.net",
      ".ytimg.com",
      ".ggpht.com",
      ".googleusercontent.com"
    ];
    const isAllowed = allowedHostSuffixes.some(suffix => parsed.hostname.endsWith(suffix));
    if (!isAllowed) return res.status(403).json({ error: "FORBIDDEN_DOMAIN" });

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (err) {
    console.error("[image-proxy]", imageUrl, err.message);
    return res.status(502).json({ error: "BAD_GATEWAY" });
  }
});

module.exports = { publicMediaRouter: router };
