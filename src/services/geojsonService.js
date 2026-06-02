const simplify = require("@turf/simplify").default;

/**
 * In-memory cache for simplified/filtered GeoJSON.
 * Keyed by: `${r2Key}::${tolerance}::${circle}`
 */
const cache = new Map();

function cacheKey(r2Key, tolerance, circle) {
  return `${r2Key}::${Number(tolerance)}::${String(circle || "")}`;
}

function isFeatureCollection(obj) {
  return obj && obj.type === "FeatureCollection" && Array.isArray(obj.features);
}

function simplifyGeoJson(geo, { tolerance = 0.01, highQuality = false } = {}) {
  if (!isFeatureCollection(geo)) return geo;
  // Turf simplify mutates by default if mutate=true; keep it immutable
  return simplify(geo, { tolerance, highQuality, mutate: false });
}

function getCached(r2Key, tolerance, circle) {
  return cache.get(cacheKey(r2Key, tolerance, circle)) || null;
}

function setCached(r2Key, tolerance, circle, geo) {
  cache.set(cacheKey(r2Key, tolerance, circle), geo);
  return geo;
}

module.exports = { simplifyGeoJson, getCached, setCached };

