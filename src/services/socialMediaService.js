const { env } = require("../config/env");
const { CandidateSocialLink } = require("../models/CandidateSocialLink");

const FB_BASE = "https://graph.facebook.com/v25.0";

/* ─── Instagram helpers ─────────────────────────────────── */

async function fetchIgStats(igUserId) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token || !igUserId) return null;
  try {
    const fields = "id,username,followers_count,follows_count,media_count,biography,website";
    const res = await fetch(`${FB_BASE}/${igUserId}?fields=${fields}&access_token=${token}`);
    const d   = await res.json();
    if (d.error) { console.error("[ig-stats]", d.error.message); return null; }
    return {
      platform:   "instagram",
      igUserId,
      handle:     d.username ? `@${d.username}` : null,
      followers:  fmt(d.followers_count),
      following:  fmt(d.follows_count),
      posts:      d.media_count ? String(d.media_count) : null,
      bio:        d.biography   || null,
      website:    d.website     || null,
      connected:  true,
    };
  } catch (e) {
    console.error("[ig-stats]", e.message);
    return null;
  }
}

async function fetchIgPosts(igUserId, limit = 10) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token || !igUserId) return [];
  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count";
    const res = await fetch(
      `${FB_BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${token}`
    );
    const d = await res.json();
    if (d.error) { console.error("[ig-posts]", d.error.message); return []; }
    return (d.data || []).map((p) => ({
      id:       p.id,
      platform: "instagram",
      content:  p.caption || "(No caption)",
      date:     fmtDate(p.timestamp),
      likes:    p.like_count     ?? null,
      comments: p.comments_count ?? null,
      shares:   null,
      type:     mediaLabel(p.media_type),
      url:      p.permalink || null,
      mediaUrl: p.media_url || p.thumbnail_url || null,
    }));
  } catch (e) {
    console.error("[ig-posts]", e.message);
    return [];
  }
}

/* ─── Main export ───────────────────────────────────────── */

/**
 * Get social media data for a specific candidate in a constituency.
 * - Looks up CandidateSocialLink in DB for stored handles
 * - Fetches live stats & posts for each connected platform
 * - Falls back to showing "not connected" for platforms with no handle
 */
async function getSocialMediaData({ stateCode, bodyType, year, seatNo, candidateName } = {}) {
  let link = null;

  // Try to find stored social links for this candidate
  if (seatNo && candidateName) {
    try {
      link = await CandidateSocialLink.findOne({
        stateCode: (stateCode || "UP").toUpperCase(),
        bodyType:  (bodyType  || "VIDHAN_SABHA").toUpperCase(),
        year:      String(year || "2022"),
        seatNo:    Number(seatNo),
        candidateName: { $regex: new RegExp(`^${escapeRegex(candidateName)}$`, "i") },
      });
    } catch (e) {
      console.error("[social-link-lookup]", e.message);
    }
  }

  const igUserId = link?.instagram?.igUserId || null;

  // Fetch Instagram (only if igUserId is stored)
  const [igStats, igPosts] = igUserId
    ? await Promise.all([fetchIgStats(igUserId), fetchIgPosts(igUserId, 10)])
    : [null, []];

  const platforms = [
    igStats || {
      platform:  "instagram",
      connected: false,
      handle:    link?.instagram?.handle || null,
      profileUrl:link?.instagram?.profileUrl || null,
    },
    {
      platform:  "facebook",
      connected: false,
      handle:    link?.facebook?.handle || null,
      profileUrl:link?.facebook?.profileUrl || null,
    },
    {
      platform:  "youtube",
      connected: false,
      handle:    link?.youtube?.handle || null,
      profileUrl:link?.youtube?.profileUrl || null,
    },
    {
      platform:  "twitter",
      connected: false,
      handle:    link?.twitter?.handle || null,
      profileUrl:link?.twitter?.profileUrl || null,
    },
    {
      platform:  "threads",
      connected: false,
      handle:    link?.threads?.handle || null,
      profileUrl:link?.threads?.profileUrl || null,
    },
  ];

  return {
    candidateName: candidateName || null,
    seatName:      link?.seatName || null,
    hasLinks:      !!link,
    platforms,
    posts: igPosts,
  };
}

/* ─── Utils ─────────────────────────────────────────────── */
function fmt(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function mediaLabel(type) {
  return { IMAGE: "Image", VIDEO: "Video", CAROUSEL_ALBUM: "Carousel" }[type] || "Post";
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { getSocialMediaData };
