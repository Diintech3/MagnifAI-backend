const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAccessToken(payload, expiresIn = "8h") {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };

