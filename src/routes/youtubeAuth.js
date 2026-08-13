const express = require("express");
const axios = require("axios");
const { CEO } = require("../models/CEO");
const { env } = require("../config/env");

const { requireAuth } = require("../middleware/auth");
const { App } = require("../models/App");
const router = express.Router();

async function getSocialEntityForUser(req) {
  if (req.user.appId) {
    return CEO.findById(req.user.sub);
  }
  return App.findById(req.user.sub);
}

// Helper to construct redirect URI
function getRedirectUri(req) {
  const protocol = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  return `${protocol}://${req.headers.host}/api/app/social/youtube/callback`;
}

/**
 * Generate Google OAuth Auth URL for the CEO
 * GET /api/app/social/youtube/auth-url
 */
router.get("/youtube/auth-url", requireAuth, async (req, res) => {
  try {
    const entity = await getSocialEntityForUser(req);
    if (!entity) {
      return res.status(404).json({ error: "ENTITY_NOT_FOUND" });
    }
    const ceoId = entity._id.toString();

    const redirectUri = getRedirectUri(req);
    const scopes = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload"
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.Google_Client_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${ceoId}`;

    return res.json({ url: authUrl });
  } catch (err) {
    console.error("[youtube-auth-url-error]", err.message);
    return res.status(500).json({ error: "AUTH_URL_ERROR", message: err.message });
  }
});

/**
 * Google OAuth Callback
 * GET /api/app/social/youtube/callback
 */
router.get("/youtube/callback", async (req, res) => {
  const { code, state: ceoId, error } = req.query;

  if (error) {
    console.error("[youtube-callback-google-error]", error);
    // Redirect back with error query
    return res.redirect(`http://localhost:5173/ceo/popularity?youtube_error=${encodeURIComponent(error)}`);
  }

  if (!code || !ceoId) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const redirectUri = getRedirectUri(req);

    // 1. Exchange authorization code for tokens
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: env.Google_Client_ID,
      client_secret: env.Google_Secret_ID,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // 2. Fetch channel details using the access token
    const channelRes = await axios.get("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!channelRes.data.items || channelRes.data.items.length === 0) {
      throw new Error("No YouTube channel found for this Google account.");
    }

    const channelItem = channelRes.data.items[0];
    const channelId = channelItem.id;
    const channelName = channelItem.snippet?.title || "YouTube Channel";
    const channelUrl = `https://www.youtube.com/${channelItem.snippet?.customUrl || `channel/${channelId}`}`;

    // 3. Save details to CEO or App document
    let entity = await CEO.findById(ceoId);
    if (!entity) {
      entity = await App.findById(ceoId);
    }
    if (!entity) {
      return res.status(404).send("User or App not found");
    }

    if (!entity.social) {
      entity.social = {};
    }

    entity.social.youtube = {
      channelId,
      channelName,
      youtubeRefreshToken: refresh_token || entity.social.youtube?.youtubeRefreshToken, // Google only sends refresh_token on initial consent
      youtubeAccessToken: access_token,
      youtubeTokenExpires: new Date(Date.now() + (expires_in * 1000))
    };

    entity.markModified("social");
    await entity.save();

    console.log(`[youtube-oauth-success] Connected channel: ${channelName} for entity: ${entity.name}`);

    // 4. Redirect user back to frontend popularity page
    // In production, we can determine frontend base from referer or request headers,
    // fallback to localhost:5173 for development
    const referer = req.headers.referer;
    let frontendUrl = "http://localhost:5173/ceo/popularity";
    if (referer && !referer.includes("localhost:4000")) {
      try {
        const refUrl = new URL(referer);
        frontendUrl = `${refUrl.protocol}//${refUrl.host}/ceo/popularity`;
      } catch (e) {}
    }

    return res.redirect(`${frontendUrl}?youtube_connected=true`);
  } catch (err) {
    console.error("[youtube-callback-error]", err.response ? err.response.data : err.message);
    const errMsg = err.response?.data?.error_description || err.message;
    return res.redirect(`http://localhost:5173/ceo/popularity?youtube_error=${encodeURIComponent(errMsg)}`);
  }
});

module.exports = { youtubeAuthRouter: router };
