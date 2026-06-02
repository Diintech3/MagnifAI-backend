const ALLOWED_PREFIXES = ["apps/logos/", "candidates/party-logos/", "candidates/photos/"];

function extractMediaKey(url) {
  if (!url || typeof url !== "string") return null;
  for (const prefix of ALLOWED_PREFIXES) {
    const re = new RegExp(`${prefix.replace(/\//g, "\\/")}[^/?#]+`);
    const match = url.match(re);
    if (match) return match[0];
  }
  return null;
}

function resolvePublicMediaUrl(url, storedKey) {
  const key = storedKey || extractMediaKey(url);
  if (key) return `/api/public/logo?key=${encodeURIComponent(key)}`;
  return url || null;
}

/** @deprecated use resolvePublicMediaUrl */
const resolvePublicLogoUrl = resolvePublicMediaUrl;
const extractLogoKey = extractMediaKey;

module.exports = {
  ALLOWED_PREFIXES,
  extractMediaKey,
  extractLogoKey,
  resolvePublicMediaUrl,
  resolvePublicLogoUrl,
};
