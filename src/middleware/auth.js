const { verifyAccessToken } = require("../utils/jwt");

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "UNAUTHENTICATED" });
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHENTICATED" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
    return next();
  };
}

module.exports = { requireAuth, requireRole };

