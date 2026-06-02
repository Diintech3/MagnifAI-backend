const express = require("express");
const { isR2Configured, getObjectFromR2 } = require("../utils/r2");
const { simplifyGeoJson, getCached, setCached } = require("../services/geojsonService");

const router = express.Router();

function normalizeGeoKey(raw) {
  if (!raw) return null;
  const key = Array.isArray(raw) ? raw.join("/") : String(raw);
  const decoded = decodeURIComponent(key).replace(/^\/+/, "");

  // Allow only static geojson assets from R2.
  // (Keeps the surface area tight and avoids exposing arbitrary bucket objects.)
  if (!decoded.startsWith("static/")) return null;
  if (!decoded.toLowerCase().endsWith(".geojson")) return null;
  return decoded;
}

async function serveGeoJson(req, res, key) {
  if (!key) return res.status(400).json({ error: "INVALID_KEY" });
  if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });

  try {
    const toleranceRaw = req.query.tolerance;
    const tolerance = toleranceRaw === undefined ? null : Number(toleranceRaw);
    const useSimplify = Number.isFinite(tolerance) && tolerance > 0;
    const circle = typeof req.query.circle === "string" ? req.query.circle.trim() : "";

    if (useSimplify) {
      const cached = getCached(key, tolerance, circle);
      if (cached) {
        res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.json(cached);
      }
    }

    const object = await getObjectFromR2(key);
    const bytes = await object.Body.transformToByteArray();
    const text = Buffer.from(bytes).toString("utf8");

    let geo;
    try {
      geo = JSON.parse(text);
    } catch (_e) {
      return res.status(415).json({ error: "INVALID_GEOJSON" });
    }

    // Optional filter: for pincode boundaries, Circle usually maps to state/UT.
    // Example: "Delhi", "Uttar Pradesh", "Tamil Nadu".
    if (circle && geo?.type === "FeatureCollection" && Array.isArray(geo.features)) {
      const needle = circle.toLowerCase();
      geo = {
        ...geo,
        features: geo.features.filter((f) => {
          const c = String(f?.properties?.Circle || "").toLowerCase();
          return c.includes(needle);
        }),
      };
    }

    if (useSimplify) {
      const simplified = simplifyGeoJson(geo, { tolerance, highQuality: false });
      setCached(key, tolerance, circle, simplified);
      res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(simplified);
    }

    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.json(geo);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[geojson]", key, err?.message || err);
    return res.status(404).json({ error: "NOT_FOUND" });
  }
}

router.get("/", (req, res) => serveGeoJson(req, res, normalizeGeoKey(req.query.key)));

module.exports = { geoJsonRouter: router };

