const express = require("express");
const { isR2Configured, getObjectFromR2 } = require("../utils/r2");

const router = express.Router();

function normalizeKey(raw) {
  if (!raw) return null;
  const key = Array.isArray(raw) ? raw.join("/") : String(raw);
  const decoded = decodeURIComponent(key).replace(/^\/+/, "");
  if (!decoded.startsWith("apps/logos/") && !decoded.startsWith("candidates/")) return null;
  return decoded;
}

async function serveLogo(req, res, key) {
  if (!key) return res.status(400).json({ error: "INVALID_KEY" });
  if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });

  try {
    const object = await getObjectFromR2(key);
    res.setHeader("Content-Type", object.ContentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (object.Body?.pipe) {
      object.Body.pipe(res);
      return;
    }
    const bytes = await object.Body.transformToByteArray();
    return res.send(Buffer.from(bytes));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[public/logo]", key, err?.message || err);
    return res.status(404).json({ error: "NOT_FOUND" });
  }
}

router.get("/logo", (req, res) => serveLogo(req, res, normalizeKey(req.query.key)));

router.get("/logos/{*key}", (req, res) => serveLogo(req, res, normalizeKey(req.params.key)));

module.exports = { publicMediaRouter: router };
