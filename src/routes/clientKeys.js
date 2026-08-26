const express = require("express");
const crypto = require("crypto");
const { CEO, toPublicCEO } = require("../models/CEO");
const { requireAuth } = require("../middleware/auth");
const { signAccessToken } = require("../utils/jwt");

const router = express.Router();

// Helper to generate a secure random 32-character key
function generate32CharKey() {
  return crypto.randomBytes(16).toString("hex");
}

// 1. Login with API Key (Public endpoint)
// POST /api/client/login-with-key
router.post("/login-with-key", async (req, res) => {
  try {
    const { clientKey } = req.body;
    if (!clientKey) {
      return res.status(400).json({ success: false, message: "Client key is required" });
    }

    // Find active CEO with this clientKey
    const ceo = await CEO.findOne({ clientKey, isActive: { $ne: false } });
    if (!ceo) {
      return res.status(401).json({ success: false, message: "Invalid or inactive client API key" });
    }

    // Sign the standard JWT access token for this CEO
    const token = signAccessToken({
      sub: ceo._id.toString(),
      appId: ceo.appId.toString(),
      email: ceo.email,
      role: "CEO",
      name: ceo.name,
    });

    return res.json({
      success: true,
      token,
      client: {
        _id: ceo._id.toString(),
        name: ceo.name,
        email: ceo.email,
        businessName: ceo.company || ceo.name,
        gstNo: ceo.gstNo || "NAN",
        panNo: ceo.panNo || "NAN",
        city: ceo.city || "",
        pincode: ceo.pincode || "",
        websiteUrl: ceo.website || ""
      }
    });
  } catch (err) {
    console.error("[login-with-key-error]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 2. Fetch Current Key (Protected)
// GET /api/client/key
router.get("/key", requireAuth, async (req, res) => {
  try {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }
    return res.json({ success: true, clientKey: ceo.clientKey || null });
  } catch (err) {
    console.error("[get-key-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// 3. Generate New Key (Protected)
// POST /api/client/key/generate
router.post("/key/generate", requireAuth, async (req, res) => {
  try {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    const newKey = generate32CharKey();
    ceo.clientKey = newKey;
    await ceo.save();

    console.log(`[clientKeys] Generated new API key for CEO "${ceo.name}"`);
    return res.json({ success: true, clientKey: newKey });
  } catch (err) {
    console.error("[generate-key-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// 4. Revoke (Delete) Key (Protected)
// DELETE /api/client/key
router.delete("/key", requireAuth, async (req, res) => {
  try {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    ceo.clientKey = null;
    await ceo.save();

    console.log(`[clientKeys] Revoked API key for CEO "${ceo.name}"`);
    return res.json({ success: true, message: "API key revoked successfully" });
  } catch (err) {
    console.error("[revoke-key-error]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = { clientKeysRouter: router };
