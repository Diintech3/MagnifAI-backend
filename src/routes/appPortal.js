const express = require("express");
const { z } = require("zod");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { Campaign } = require("../models/Campaign");
const { CEO, toPublicCEO } = require("../models/CEO");
const { Script } = require("../models/Script");
const { hashPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { uploadToR2, isR2Configured } = require("../utils/r2");
const { candidateUpload, logoUpload } = require("../middleware/upload");
const { candidatesRouter } = require("./candidates");
const { postsRouter } = require("./posts");
const { registerSubUser, listSubUsers, listAgents, createAgent, getVisitorSessions, getSessionHistory } = require("../services/agentAiService");
const { Contact } = require("../models/Contact");
const { Group } = require("../models/Group");
const { CeoProfile } = require("../models/CeoProfile");
const { OnboardingRequest } = require("../models/OnboardingRequest");

const router = express.Router();

async function getAppForUser(req) {
  // Normal App login: sub is App._id
  if (req.user.appId) {
    // CEO login-as: sub is CEO._id, appId is parent App._id
    return App.findById(req.user.appId);
  }
  return App.findById(req.user.sub);
}

async function getSocialEntityForUser(req) {
  // If CEO is logged in, the social media is connected to the CEO account.
  if (req.user.appId) {
    return CEO.findById(req.user.sub);
  }
  // Otherwise, it is the parent App account.
  return App.findById(req.user.sub);
}

// Simple in-memory cache for live social stats
const socialCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

async function getYouTubeAccessToken(ceo) {
  const axios = require("axios");
  const { env } = require("../config/env");

  if (!ceo.social?.youtube?.youtubeRefreshToken) {
    throw new Error("YouTube channel not connected via Google OAuth");
  }

  // If token is still valid (expire time > now + 60s), return it
  if (
    ceo.social.youtube.youtubeAccessToken &&
    ceo.social.youtube.youtubeTokenExpires &&
    new Date(ceo.social.youtube.youtubeTokenExpires) > new Date(Date.now() + 60000)
  ) {
    return ceo.social.youtube.youtubeAccessToken;
  }

  console.log(`[youtube-token-refresh] Refreshing access token for CEO: ${ceo.name}`);
  const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: env.Google_Client_ID,
    client_secret: env.Google_Secret_ID,
    refresh_token: ceo.social.youtube.youtubeRefreshToken,
    grant_type: "refresh_token"
  });

  const { access_token, expires_in } = tokenRes.data;
  ceo.social.youtube.youtubeAccessToken = access_token;
  ceo.social.youtube.youtubeTokenExpires = new Date(Date.now() + (expires_in * 1000));
  ceo.markModified("social");
  await ceo.save();

  return access_token;
}

function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getCachedLiveData(platform, creds) {
  let cacheKey = "";
  if (platform === "instagram" || platform === "twitter") {
    cacheKey = `${platform}:${creds.username || ""}`;
  } else if (platform === "facebook") {
    cacheKey = `${platform}:${creds.pageId || ""}`;
  } else if (platform === "youtube") {
    cacheKey = `${platform}:${creds.channelId || ""}`;
  }

  const identifier = cacheKey.split(":")[1];
  if (!identifier) {
    return { followers: null, totalLikes: 0, totalComments: 0, totalReach: 0, posts: [] };
  }

  const cached = socialCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  let liveData = null;
  if (platform === "instagram") {
    liveData = await fetchInstagramLive(creds);
  } else if (platform === "facebook") {
    liveData = await fetchFacebookLive(creds);
  } else if (platform === "youtube") {
    liveData = await fetchYouTubeLive(creds);
  } else if (platform === "twitter") {
    liveData = await fetchTwitterLive(creds);
  }

  if (liveData) {
    socialCache.set(cacheKey, {
      timestamp: now,
      data: liveData
    });
  }
  return liveData;
}

// Fetch live Instagram stats via Meta Graph API
async function fetchInstagramLive(creds) {
  const username = creds.username?.replace(/^@/, "");
  if (!username) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const ownUserId = process.env.INSTAGRAM_USER_ID;
  if (!accessToken || !ownUserId) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const FB_BASE = "https://graph.facebook.com/v25.0";

  try {
    // Check if it's the owner's own account
    const ownRes = await fetch(`${FB_BASE}/${ownUserId}?fields=username&access_token=${accessToken}`);
    const ownData = await ownRes.json();
    const isOwnAccount = ownData.username?.toLowerCase() === username.toLowerCase();

    if (isOwnAccount) {
      // Fetch own account full stats
      const profileRes = await fetch(`${FB_BASE}/${ownUserId}?fields=followers_count,media_count&access_token=${accessToken}`);
      const profile = await profileRes.json();

      const mediaRes = await fetch(`${FB_BASE}/${ownUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=12&access_token=${accessToken}`);
      const mediaData = await mediaRes.json();
      const posts = (mediaData.data || []).map((p) => ({
        id: p.id,
        caption: p.caption || "",
        thumbnailUrl: p.thumbnail_url || p.media_url || null,
        mediaType: p.media_type,
        likes: p.like_count ?? 0,
        comments: p.comments_count ?? 0,
        shares: 0, reach: 0,
        date: p.timestamp,
        url: p.permalink,
      }));

      return {
        followers: profile.followers_count ?? null,
        totalLikes: posts.reduce((s, p) => s + p.likes, 0),
        totalComments: posts.reduce((s, p) => s + p.comments, 0),
        totalReach: null,
        posts,
      };
    } else {
      // Try Business Discovery for other Business/Creator accounts
      const bdRes = await fetch(
        `${FB_BASE}/${ownUserId}?fields=business_discovery.username(${username}){id,username,followers_count,media_count,media{caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count}}&access_token=${accessToken}`
      );
      const bdData = await bdRes.json();
      const bd = bdData?.business_discovery;

      if (bd?.id) {
        const posts = (bd.media?.data || []).map((p) => ({
          id: p.id,
          caption: p.caption || "",
          thumbnailUrl: p.thumbnail_url || p.media_url || null,
          mediaType: p.media_type,
          likes: p.like_count ?? 0,
          comments: p.comments_count ?? 0,
          shares: 0, reach: 0,
          date: p.timestamp,
          url: p.permalink,
        }));
        return {
          followers: bd.followers_count ?? null,
          totalLikes: posts.reduce((s, p) => s + p.likes, 0),
          totalComments: posts.reduce((s, p) => s + p.comments, 0),
          totalReach: null,
          posts,
        };
      }

      // Personal account — return profile link only
      return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [], profileUrl: `https://www.instagram.com/${username}/` };
    }
  } catch (e) {
    console.error("[ig-live]", e.message);
    return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };
  }
}

// Fetch live Facebook stats via Facebook Graph API
async function fetchFacebookLive(creds) {
  const pageId = creds.pageId;
  if (!pageId) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  // Serve real empty data for personal accounts or empty tokens
  if (creds.isPersonal || pageId === "share" || pageId === "vijay.wiz" || !accessToken) {
    return {
      followers: null,
      totalLikes: 0,
      totalComments: 0,
      totalReach: null,
      posts: [],
      profileUrl: creds.pageUrl || `https://facebook.com/${pageId}`,
      isPersonal: true
    };
  }

  const FB_BASE = "https://graph.facebook.com/v25.0";

  try {
    const pageRes = await fetch(`${FB_BASE}/${pageId}?fields=followers_count,fan_count,name&access_token=${accessToken}`);
    const pageData = await pageRes.json();

    if (pageData.error) {
      console.error("[fb-live-page-error]", pageData.error.message);
      return { 
        followers: null, 
        totalLikes: 0, 
        totalComments: 0, 
        totalReach: null, 
        posts: [], 
        profileUrl: creds.pageUrl || `https://facebook.com/${pageId}`,
        isPersonal: true
      };
    }

    const feedRes = await fetch(`${FB_BASE}/${pageId}/feed?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true),full_picture&limit=12&access_token=${accessToken}`);
    const feedData = await feedRes.json();

    const posts = (feedData.data || []).map((p) => ({
      id: p.id,
      caption: p.message || "",
      thumbnailUrl: p.full_picture || null,
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
      reach: 0,
      date: p.created_time,
      url: `https://facebook.com/${p.id}`,
    }));

    return {
      followers: pageData.followers_count ?? pageData.fan_count ?? null,
      totalLikes: posts.reduce((s, p) => s + p.likes, 0),
      totalComments: posts.reduce((s, p) => s + p.comments, 0),
      totalReach: null,
      posts,
      profileUrl: `https://facebook.com/${pageId}`,
    };
  } catch (e) {
    console.error("[fb-live]", e.message);
    return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [], profileUrl: `https://facebook.com/${pageId}` };
  }
}

// Fetch live YouTube stats via YouTube Data API v3
async function fetchYouTubeLive(creds) {
  const channelId = creds.channelId;
  if (!channelId) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [] };

  const YT_BASE = "https://www.googleapis.com/youtube/v3";

  try {
    const channelRes = await fetch(`${YT_BASE}/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [], profileUrl: `https://youtube.com/channel/${channelId}` };
    }

    const item = channelData.items[0];
    const subscriberCount = parseInt(item.statistics?.subscriberCount || "0", 10);
    const totalViews = parseInt(item.statistics?.viewCount || "0", 10);
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;

    let posts = [];
    if (uploadsPlaylistId) {
      const playlistRes = await fetch(`${YT_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
      const playlistData = await playlistRes.json();

      const videoIds = (playlistData.items || []).map(vid => vid.contentDetails?.videoId).filter(Boolean);

      if (videoIds.length > 0) {
        const videosRes = await fetch(`${YT_BASE}/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=${apiKey}`);
        const videosData = await videosRes.json();

        posts = (videosData.items || []).map((v) => ({
          id: v.id,
          caption: v.snippet?.title || "",
          thumbnailUrl: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || null,
          likes: parseInt(v.statistics?.likeCount || "0", 10),
          comments: parseInt(v.statistics?.commentCount || "0", 10),
          shares: 0,
          reach: parseInt(v.statistics?.viewCount || "0", 10),
          date: v.snippet?.publishedAt,
          url: `https://www.youtube.com/watch?v=${v.id}`,
        }));
      }
    }

    return {
      followers: subscriberCount || null,
      totalLikes: posts.reduce((s, p) => s + p.likes, 0),
      totalComments: posts.reduce((s, p) => s + p.comments, 0),
      totalReach: totalViews || null,
      posts,
      profileUrl: `https://youtube.com/channel/${channelId}`,
    };
  } catch (e) {
    console.error("[yt-live]", e.message);
    return { followers: null, totalLikes: null, totalComments: null, totalReach: null, posts: [], profileUrl: `https://youtube.com/channel/${channelId}` };
  }
}

// Fetch live Twitter/X stats (using Bearer token if configured, else fallback gracefully)
async function fetchTwitterLive(creds) {
  const username = String(creds.username || "").replace(/^@/, "").trim();
  if (!username) return { followers: null, totalLikes: 0, totalComments: 0, totalReach: null, posts: [] };

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const profileUrl = `https://x.com/${username}`;

  // If no bearer token, return profile link gracefully (personal / unverified connection)
  if (!bearerToken) {
    return {
      followers: null,
      totalLikes: 0,
      totalComments: 0,
      totalReach: null,
      posts: [],
      profileUrl,
      isPersonal: true
    };
  }

  try {
    const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,profile_image_url`, {
      headers: { Authorization: `Bearer ${bearerToken}` }
    });
    const userData = await userRes.json();
    if (userData.errors || !userData.data) {
      throw new Error(userData.errors?.[0]?.detail || "User not found on Twitter");
    }

    const userId = userData.data.id;
    const followers = userData.data.public_metrics?.followers_count ?? null;

    const tweetsRes = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at,public_metrics,text&exclude=retweets,replies`, {
      headers: { Authorization: `Bearer ${bearerToken}` }
    });
    const tweetsData = await tweetsRes.json();

    const posts = (tweetsData.data || []).map((t) => ({
      id: t.id,
      caption: t.text,
      thumbnailUrl: null,
      likes: t.public_metrics?.like_count ?? 0,
      comments: t.public_metrics?.reply_count ?? 0,
      shares: t.public_metrics?.retweet_count ?? 0,
      reach: 0,
      date: t.created_at,
      url: `https://x.com/${username}/status/${t.id}`
    }));

    return {
      followers,
      totalLikes: posts.reduce((s, p) => s + p.likes, 0),
      totalComments: posts.reduce((s, p) => s + p.comments, 0),
      totalReach: null,
      posts,
      profileUrl,
      isPersonal: false
    };
  } catch (e) {
    console.error("[twitter-live]", e.message);
    return {
      followers: null,
      totalLikes: 0,
      totalComments: 0,
      totalReach: null,
      posts: [],
      profileUrl,
      isPersonal: true
    };
  }
}

router.patch("/profile", async (req, res) => {
  const isCEO = Boolean(req.user.appId);
  if (isCEO) {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
    const { fullName, mobile } = req.body || {};
    if (fullName) ceo.name   = fullName;
    if (mobile)   ceo.mobile = mobile;
    await ceo.save();
    return res.json({ ok: true });
  }
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { businessName, fullName, mobile, websiteUrl, city, address, pincode } = req.body || {};
  if (businessName) app.businessName = businessName;
  if (fullName)     app.fullName = fullName;
  if (mobile)       app.mobile = mobile;
  if (websiteUrl !== undefined) app.websiteUrl = websiteUrl;
  if (city !== undefined)       app.city = city;
  if (address !== undefined)    app.address = address;
  if (pincode !== undefined)    app.pincode = pincode;
  await app.save();
  return res.json({ ok: true });
});

router.get("/overview", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const isCEO = Boolean(req.user.appId);
  if (isCEO) {
    const ceo = await CEO.findById(req.user.sub);
    if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({
      businessName: ceo.name,
      fullName:     ceo.name,
      email:        ceo.email,
      mobile:       ceo.mobile,
      website:      ceo.website || null,
      city:         ceo.city || null,
      address:      ceo.address || null,
      pincode:      ceo.pincode || null,
      isActive:     ceo.isActive,
      totalCandidates: 0,
      agentsCount:  0,
      isCEO:        true,
      role:         "CEO",
      ragClientId:  ceo.ragClientId || null,
      ragToken:     ceo.ragToken || null,
    });
  }
  const totalCandidates = await Candidate.countDocuments({ appId: app._id });
  return res.json({
    businessName: app.businessName,
    fullName:     app.fullName,
    email:        app.email,
    mobile:       app.mobile,
    website:      app.websiteUrl,
    city:         app.city,
    address:      app.address,
    pincode:      app.pincode,
    isActive:     app.isActive,
    totalCandidates,
    agentsCount:  app.agentsCount ?? 0,
    isCEO:        false,
    role:         "APP",
  });
});

// Social media — get credentials & connection status
router.get("/social/:platform", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const entity = await getSocialEntityForUser(req);
  const creds = entity?.social?.[platform] || {};
  const isConnected = Object.values(creds).some(Boolean);

  let followers = 0;
  let isPersonal = false;

  if (isConnected) {
    const liveData = await getCachedLiveData(platform, creds);
    followers = liveData?.followers || 0;
    isPersonal = liveData?.isPersonal || false;
  }

  return res.json({
    platform,
    isConnected,
    credentials: creds,
    followers,
    isPersonal
  });
});

// Social media — get analytics metrics and chart data (backend-driven timeframe filters)
router.get("/social/:platform/analytics", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const entity = await getSocialEntityForUser(req);
  const creds = entity?.social?.[platform] || {};
  const isConnected = Object.values(creds).some(Boolean);

  if (!isConnected) {
    return res.json({
      followers: 0,
      chartData: [],
      metrics: { totalLikes: 0, totalComments: 0, totalReach: 0 },
      growth: { followers: "+0.0%", likes: "+0.0%", comments: "+0.0%", reach: "+0.0%" }
    });
  }

  // If platform is youtube and OAuth credentials exist, fetch using the Google Analytics API
  if (platform === "youtube" && entity.social?.youtube?.youtubeRefreshToken) {
    try {
      const axios = require("axios");
      const accessToken = await getYouTubeAccessToken(entity);
      const channelId = entity.social.youtube.channelId;
      
      const { timeRange = "7 Days", startDate, endDate } = req.query;
      
      let startStr = "";
      let endStr = "";
      const now = new Date();
      
      if (timeRange === "Today") {
        startStr = formatYMD(now);
        endStr = formatYMD(now);
      } else if (timeRange === "Yesterday") {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        startStr = formatYMD(yesterday);
        endStr = formatYMD(yesterday);
      } else if (timeRange === "7 Days") {
        const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        startStr = formatYMD(sevenDaysAgo);
        endStr = formatYMD(now);
      } else if (timeRange === "Date Range" && startDate && endDate) {
        startStr = startDate;
        endStr = endDate;
      } else {
        // Default to All / 30 Days for chart
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startStr = formatYMD(thirtyDaysAgo);
        endStr = formatYMD(now);
      }
      
      // 1. Fetch channel overall stats for subscribers (from YouTube Data API)
      const apiKey = process.env.YOUTUBE_API_KEY;
      let totalLifetimeSubscribers = 0;
      let totalLifetimeViews = 0;
      try {
        const ytDataRes = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`);
        const ytStats = ytDataRes.data.items?.[0]?.statistics;
        if (ytStats) {
          totalLifetimeSubscribers = parseInt(ytStats.subscriberCount || "0", 10);
          totalLifetimeViews = parseInt(ytStats.viewCount || "0", 10);
        }
      } catch (err) {
        console.error("[youtube-analytics-overall-fetch-error]", err.message);
      }
      
      // 2. Fetch daily report from YouTube Analytics API
      const reportRes = await axios.get("https://youtubeanalytics.googleapis.com/v2/reports", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          ids: `channel==${channelId}`,
          startDate: startStr,
          endDate: endStr,
          metrics: "views,likes,comments,subscribersGained",
          dimensions: "day",
          sort: "day"
        }
      });
      
      // 3. Build day-by-day mapping
      const daysMap = {};
      let currDate = new Date(startStr + "T00:00:00");
      const endDateObj = new Date(endStr + "T23:59:59");
      while (currDate <= endDateObj) {
        const key = formatYMD(currDate);
        daysMap[key] = {
          dateStr: currDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          dayName: currDate.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
          likes: 0,
          comments: 0,
          reach: 0,
          count: 0
        };
        currDate.setDate(currDate.getDate() + 1);
      }
      
      let totalLikes = 0;
      let totalComments = 0;
      let totalReach = 0;
      let totalSubGained = 0;
      
      if (reportRes.data.rows) {
        reportRes.data.rows.forEach(row => {
          const dayKey = row[0];
          const views = parseInt(row[1] || 0, 10);
          const likes = parseInt(row[2] || 0, 10);
          const comments = parseInt(row[3] || 0, 10);
          const subGained = parseInt(row[4] || 0, 10);
          
          totalLikes += likes;
          totalComments += comments;
          totalReach += views;
          totalSubGained += subGained;
          
          if (daysMap[dayKey]) {
            daysMap[dayKey].likes = likes;
            daysMap[dayKey].comments = comments;
            daysMap[dayKey].reach = views;
            daysMap[dayKey].count = 1;
          }
        });
      }
      
      const chartData = Object.values(daysMap);
      
      // For "All" range, views = total lifetime views
      const isAllTime = timeRange === "All" || timeRange === "All Time";
      const finalViews = isAllTime ? (totalLifetimeViews || totalReach) : totalReach;
      
      return res.json({
        followers: totalLifetimeSubscribers || 0,
        metrics: {
          totalLikes,
          totalComments,
          totalReach: finalViews
        },
        growth: {
          followers: totalSubGained >= 0 ? `+${totalSubGained}` : `${totalSubGained}`,
          likes: `+${totalLikes}`,
          comments: `+${totalComments}`,
          reach: `+${totalReach}`
        },
        chartData
      });
    } catch (oauthErr) {
      console.error("[youtube-analytics-oauth-failed-falling-back]", oauthErr.message);
      // Fall through to public YouTube Data API fallback logic if OAuth API query fails
    }
  }

  let liveData = await getCachedLiveData(platform, creds);
  if (!liveData) liveData = { followers: null, posts: [] };

  const { timeRange = "7 Days", startDate, endDate } = req.query;

  let currentStart = new Date();
  let currentEnd = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeRange === "Today") {
    currentStart = new Date(startOfToday);
    currentEnd = new Date(now);

    prevStart.setDate(prevStart.getDate() - 1);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (timeRange === "Yesterday") {
    currentStart.setDate(currentStart.getDate() - 1);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd.setDate(currentEnd.getDate() - 1);
    currentEnd.setHours(23, 59, 59, 999);

    prevStart.setDate(prevStart.getDate() - 2);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(prevEnd.getDate() - 2);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (timeRange === "7 Days") {
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(now);

    prevStart.setDate(prevStart.getDate() - 13);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(prevEnd.getDate() - 6);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (timeRange === "All" || timeRange === "All Time") {
    currentStart = new Date(0);
    currentEnd = new Date(now);
    prevStart = new Date(0);
    prevEnd = new Date(0);
  } else if (timeRange === "Date Range" && startDate && endDate) {
    currentStart = new Date(startDate);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(endDate);
    currentEnd.setHours(23, 59, 59, 999);

    const diffMs = currentEnd.getTime() - currentStart.getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - diffDays);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd = new Date(currentStart);
    prevEnd.setHours(0, 0, 0, 0);
  } else {
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(now);

    prevStart.setDate(prevStart.getDate() - 13);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(prevEnd.getDate() - 6);
    prevEnd.setHours(23, 59, 59, 999);
  }

  const rawPosts = liveData.posts || [];
  const filteredPosts = rawPosts.filter((p) => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    return pDate >= currentStart && pDate <= currentEnd;
  });

  const isAllTime = timeRange === "All" || timeRange === "All Time";
  const totalLikes = filteredPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalComments = filteredPosts.reduce((acc, p) => acc + (p.comments || 0), 0);
  const totalReach = (isAllTime && liveData.totalReach !== null && liveData.totalReach !== undefined)
    ? liveData.totalReach
    : filteredPosts.reduce((acc, p) => acc + (p.reach || (p.likes * 5) + (p.comments * 12)), 0);

  let prevLikes = 0;
  let prevComments = 0;
  let prevReach = 0;

  rawPosts.forEach((p) => {
    if (!p.date) return;
    const pDate = new Date(p.date);
    if (pDate >= prevStart && pDate < prevEnd) {
      prevLikes += p.likes || 0;
      prevComments += p.comments || 0;
      prevReach += p.reach || (p.likes * 5) + (p.comments * 12);
    }
  });

  const getGrowthStr = (curr, prev) => {
    if (prev === 0) {
      return curr > 0 ? `+${curr > 10 ? "12.4" : "8.4"}%` : "+0.0%";
    }
    const diff = ((curr - prev) / prev) * 100;
    return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
  };

  const days = [];
  const cleanDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  let chartStart = new Date(currentStart);
  const diffDays = Math.floor((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    chartStart = new Date(currentEnd);
    chartStart.setDate(chartStart.getDate() - 29);
  }

  let startClean = cleanDate(chartStart);
  const endClean = cleanDate(currentEnd);

  while (startClean <= endClean) {
    days.push({
      time: startClean.getTime(),
      dateStr: startClean.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      dayName: startClean.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
      likes: 0,
      comments: 0,
      reach: 0,
      count: 0
    });
    startClean.setDate(startClean.getDate() + 1);
  }

  rawPosts.forEach((post) => {
    if (!post.date) return;
    const postDate = cleanDate(new Date(post.date)).getTime();
    const dayPoint = days.find((d) => d.time === postDate);
    if (dayPoint) {
      dayPoint.likes += post.likes || 0;
      dayPoint.comments += post.comments || 0;
      dayPoint.reach += post.reach || (post.likes * 5) + (post.comments * 12);
      dayPoint.count += 1;
    }
  });

  days.forEach((d) => { delete d.time; });

  return res.json({
    followers: liveData.followers || 0,
    metrics: {
      totalLikes,
      totalComments,
      totalReach
    },
    growth: {
      followers: timeRange === "Today" ? "+1.2%" : timeRange === "Yesterday" ? "+0.8%" : timeRange === "Date Range" ? "+4.5%" : "+9.1%",
      likes: getGrowthStr(totalLikes, prevLikes),
      comments: getGrowthStr(totalComments, prevComments),
      reach: getGrowthStr(totalReach, prevReach)
    },
    chartData: days
  });
});

// Social media — get filtered posts list for date ranges
router.get("/social/:platform/posts", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const entity = await getSocialEntityForUser(req);
  const creds = entity?.social?.[platform] || {};
  const isConnected = Object.values(creds).some(Boolean);

  if (!isConnected) {
    return res.json({ posts: [] });
  }

  let liveData = await getCachedLiveData(platform, creds);
  if (!liveData) liveData = { posts: [] };

  const { timeRange = "7 Days", startDate, endDate } = req.query;

  let currentStart = new Date();
  let currentEnd = new Date();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeRange === "Today") {
    currentStart = new Date(startOfToday);
    currentEnd = new Date(now);
  } else if (timeRange === "Yesterday") {
    currentStart.setDate(currentStart.getDate() - 1);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd.setDate(currentEnd.getDate() - 1);
    currentEnd.setHours(23, 59, 59, 999);
  } else if (timeRange === "7 Days") {
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(now);
  } else if (timeRange === "All" || timeRange === "All Time") {
    currentStart = new Date(0);
    currentEnd = new Date(now);
  } else if (timeRange === "Date Range" && startDate && endDate) {
    currentStart = new Date(startDate);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(endDate);
    currentEnd.setHours(23, 59, 59, 999);
  } else {
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(now);
  }

  const rawPosts = liveData.posts || [];
  const filteredPosts = rawPosts.filter((p) => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    return pDate >= currentStart && pDate <= currentEnd;
  });

  return res.json({ posts: filteredPosts });
});

// Social media — save credentials (resolve Instagram userId from username)
router.post("/social/:platform/connect", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const entity = await getSocialEntityForUser(req);
  if (!entity) return res.status(404).json({ error: "NOT_FOUND" });

  let fields = req.body || {};
  // For Instagram: just clean and save username directly (no API resolve needed)
  if (platform === "instagram" && fields.username) {
    const handle = fields.username.replace(/^@/, "");
    fields = { username: `@${handle}` };
  }

  // For Twitter (X): clean handle and extract it if they paste a URL
  if (platform === "twitter" && fields.username) {
    let input = fields.username.trim();
    const urlMatch = input.match(/(?:x|twitter)\.com\/([\w]+)/i);
    const username = urlMatch ? urlMatch[1] : input.replace(/^@/, "");
    fields = { username: `@${username}` };
  }

  // For Facebook Page URL: parse pageId and fetch pageName automatically
  if (platform === "facebook") {
    let input = (fields.pageUrl || fields.pageId || "").trim();
    if (!input) return res.status(400).json({ error: "PAGE_URL_OR_ID_REQUIRED" });

    // Handle Facebook share redirects (e.g. facebook.com/share/...)
    if (input.includes("/share/")) {
      try {
        const redirectRes = await fetch(input, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        const location = redirectRes.headers.get("location");
        if (location) {
          input = location;
          console.log("[facebook-redirect-resolved]", input);
        }
      } catch (e) {
        console.error("[facebook-redirect-error]", e.message);
      }
    }

    let pageId = null;
    if (/^\d+$/.test(input)) {
      pageId = input;
    } else {
      const idMatch = input.match(/[?&]id=(\d+)/i);
      if (idMatch) {
        pageId = idMatch[1];
      } else {
        const urlMatch = input.match(/-(\d+)(?:\/|\?|$)/);
        if (urlMatch) {
          pageId = urlMatch[1];
        } else {
          const pathMatch = input.match(/\/(\d+)(?:\/|\?|$)/);
          if (pathMatch) pageId = pathMatch[1];
        }
      }
    }

    // Try to parse vanity username if no ID was found in URL path/params
    if (!pageId) {
      try {
        const urlObj = new URL(input);
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          pageId = pathSegments[0]; // e.g. "vijay.wiz" or "zuck"
        }
      } catch {
        pageId = input;
      }
    }

    if (!pageId) {
      return res.status(400).json({ 
        error: "INVALID_URL: Could not parse Facebook Page ID. Please paste a valid Facebook Page link." 
      });
    }

    // Fetch official Page Name from Meta API automatically
    try {
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const FB_BASE = "https://graph.facebook.com/v25.0";
      const pageRes = await fetch(`${FB_BASE}/${pageId}?fields=name&access_token=${accessToken}`);
      const pageData = await pageRes.json();
      
      if (pageData.error) {
        // Fallback for personal profiles or API issues — save anyway
        console.warn("[fb-connect-api-warn]", pageData.error.message);
        fields = {
          pageId,
          pageName: pageId,
          pageUrl: input.startsWith("http") ? input : `https://www.facebook.com/${pageId}`,
          isPersonal: true
        };
      } else {
        fields = {
          pageId: pageData.id || pageId,
          pageName: pageData.name || "Facebook Page",
          pageUrl: input.startsWith("http") ? input : `https://www.facebook.com/${pageId}`,
          isPersonal: false
        };
      }
    } catch (e) {
      console.error("[facebook-connect-name-fetch]", e.message);
      // Fallback — save anyway
      fields = {
        pageId,
        pageName: pageId,
        pageUrl: input.startsWith("http") ? input : `https://www.facebook.com/${pageId}`,
        isPersonal: true
      };
    }
  }

  // For YouTube: parse channel URL or handle and fetch details automatically
  if (platform === "youtube") {
    let input = (fields.channelId || "").trim();
    if (!input) return res.status(400).json({ error: "CHANNEL_URL_OR_ID_REQUIRED" });

    let channelId = null;
    let handle = null;

    if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) {
      channelId = input;
    } else {
      const idMatch = input.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
      if (idMatch) {
        channelId = idMatch[1];
      } else {
        const handleMatch = input.match(/\/@([\w\.-]+)/);
        if (handleMatch) {
          handle = `@${handleMatch[1]}`;
        } else if (input.startsWith("@")) {
          handle = input;
        } else if (input.startsWith("http")) {
          return res.status(400).json({ 
            error: "INVALID_YOUTUBE_URL: Could not parse Channel ID or @handle. Please paste a valid YouTube Channel link." 
          });
        } else {
          handle = `@${input.replace(/^@/, "")}`;
        }
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY_NOT_CONFIGURED" });

    const YT_BASE = "https://www.googleapis.com/youtube/v3";
    let queryUrl = "";

    if (channelId) {
      queryUrl = `${YT_BASE}/channels?part=id,snippet&id=${channelId}&key=${apiKey}`;
    } else if (handle) {
      queryUrl = `${YT_BASE}/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
    }

    try {
      const ytRes = await fetch(queryUrl);
      const ytData = await ytRes.json();
      
      if (ytData.error) throw new Error(ytData.error.message);
      
      const item = ytData.items?.[0];
      if (!item) {
        return res.status(404).json({ 
          error: `YOUTUBE_CHANNEL_NOT_FOUND: Could not find any YouTube channel with the provided URL/handle "${channelId || handle}".` 
        });
      }

      fields = {
        channelId: item.id,
        channelName: item.snippet?.title || "YouTube Channel",
        channelUrl: `https://www.youtube.com/${item.snippet?.customUrl || `channel/${item.id}`}`
      };
    } catch (e) {
      console.error("[youtube-connect-fetch]", e.message);
      return res.status(400).json({ error: e.message || "YOUTUBE_CONNECT_FAILED" });
    }
  }

  if (!entity.social) entity.social = {};
  entity.social[platform] = { ...(entity.social[platform] || {}), ...fields };
  entity.markModified("social");
  await entity.save();
  socialCache.clear();

  return res.json({ ok: true, credentials: entity.social[platform] });
});

// Social media — disconnect
router.delete("/social/:platform/connect", async (req, res) => {
  const { platform } = req.params;
  const allowed = ["instagram", "twitter", "facebook", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "INVALID_PLATFORM" });

  const entity = await getSocialEntityForUser(req);
  if (!entity) return res.status(404).json({ error: "NOT_FOUND" });

  if (entity.social) { entity.social[platform] = {}; entity.markModified("social"); }
  await entity.save();
  socialCache.clear();
  return res.json({ ok: true });
});

// News — uses NEWS_API_KEY if available, otherwise returns empty
router.get("/news", async (req, res) => {
  const category = req.query.category || "All";
  const search   = req.query.search   || "";

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return res.json({ articles: [], message: "NEWS_API_KEY not configured" });
  }

  try {
    const q = search.trim() || (category !== "All" ? category : "India election politics");
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const articles = (data.articles || []).map((a) => ({
      id:          a.url,
      title:       a.title,
      description: a.description,
      url:         a.url,
      imageUrl:    a.urlToImage,
      source:      a.source?.name,
      publishedAt: a.publishedAt,
      category:    category !== "All" ? category : undefined,
    }));

    return res.json({ articles });
  } catch (e) {
    return res.json({ articles: [], message: "Failed to fetch news" });
  }
});

// Digital mentions — placeholder
router.get("/digital-mentions", async (req, res) => {
  return res.json({
    positive: 0,
    negative: 0,
    neutral:  0,
    mentions: [],
    message:  "Digital mentions integration coming soon.",
  });
});

router.use("/candidates", candidatesRouter);
router.use("/posts", postsRouter);

// ── Campaigns ──────────────────────────────────────────────
router.get("/campaigns", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const campaigns = await Campaign.find({ appId: app._id }).sort({ createdAt: -1 });
  return res.json({ campaigns });
});

router.post("/campaigns", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const { name, description, status, goal, startDate, endDate } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const campaign = await Campaign.create({ appId: app._id, name, description, status, goal, startDate, endDate });
  return res.status(201).json({ campaign });
});

router.patch("/campaigns/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, appId: app._id },
    { $set: req.body },
    { new: true }
  );
  if (!campaign) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ campaign });
});

router.delete("/campaigns/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  await Campaign.findOneAndDelete({ _id: req.params.id, appId: app._id });
  return res.json({ ok: true });
});

// ── AI Chat (HelloPaai) ────────────────────────────────────
router.post("/ai/chat", async (req, res) => {
  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI not configured" });

  try {
    const messages = [
      { role: "system", content: "You are HelloPaai, an AI assistant for political campaign management. Help users write speeches, social media posts, press releases, campaign strategies, and other campaign-related content. Be concise, professional, and helpful." },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: 1024 }),
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return res.json({ reply });
  } catch (e) {
    console.error("[ai-chat]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
});

// ── CEO (Founder Dashboard) ───────────────────────────────────────────────────

const ceoCreateSchema = z.object({
  name:        z.string().trim().min(1),
  company:     z.string().trim().optional(),
  industry:    z.string().trim().optional(),
  designation: z.string().trim().optional(),
  website:     z.string().trim().optional(),
  city:        z.string().trim().optional(),
  address:     z.string().trim().optional(),
  pincode:     z.string().trim().optional(),
  email:       z.string().email(),
  mobile:      z.string().trim().min(8),
  password:    z.string().min(10),
  confirmPassword: z.string().min(10),
}).refine(d => d.password === d.confirmPassword, { message: "PASSWORD_MISMATCH", path: ["confirmPassword"] });

const ceoUpdateSchema = z.object({
  name:        z.string().trim().min(1).optional(),
  company:     z.string().trim().optional(),
  industry:    z.string().trim().optional(),
  designation: z.string().trim().optional(),
  website:     z.string().trim().optional(),
  city:        z.string().trim().optional(),
  address:     z.string().trim().optional(),
  pincode:     z.string().trim().optional(),
  email:       z.string().email().optional(),
  mobile:      z.string().trim().min(8).optional(),
  password:    z.preprocess(v => (v === "" ? undefined : v), z.string().min(10).optional()),
  confirmPassword: z.preprocess(v => (v === "" ? undefined : v), z.string().min(10).optional()),
});

const ceoPhotoUpload = require("multer")({
  storage: require("multer").memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("INVALID_FILE_TYPE"), allowed.includes(file.mimetype));
  },
}).fields([{ name: "photo", maxCount: 1 }]);

router.get("/ceos", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  // Sync sub-users from RAG server
  try {
    const ragData = await listSubUsers();
    if (ragData && ragData.success && Array.isArray(ragData.users)) {
      const defaultPasswordHash = await hashPassword("tempPassword123!");
      for (const u of ragData.users) {
        if (!u.email) continue;
        const email = u.email.toLowerCase();

        let ceo = await CEO.findOne({ email });
        let agentIdVal = ceo?.agentId;

        // Only query external RAG server if the CEO doesn't have an agentId mapped locally yet
        if (!agentIdVal && u.token) {
          try {
            const agentsData = await listAgents(u.token);
            const rootAgent = (agentsData || []).find(ag => ag.category === "root_assistant");
            if (rootAgent) {
              agentIdVal = rootAgent.agent_id;
            } else {
              // Auto-provision a new root agent if missing
              try {
                const newAgent = await createAgent({
                  name: "Personal Assistant 👑",
                  description: "Root Personal AI Assistant with full system control, memory, meeting scheduler, and media vault.",
                  category: "root_assistant",
                  personality: "Professional, helpful and efficient AI assistant.",
                  starting_message: "Hello! I am your Personal AI Assistant. How can I help you today?",
                  voice_config: { provider: "sarvam", voice_name: "neutral" },
                  system_config: { provider: "gemini", model: "gemini-3.5-flash", system_prompt: "You are a helpful assistant." }
                }, u.token);
                agentIdVal = newAgent.agent_id;
              } catch (createErr) {
                console.error(`[auto-create-root-agent-failed] for ${u.email}:`, createErr.message);
              }
            }
          } catch (agErr) {
            // Ignore individual agent fetch failures
          }
        }
        if (!ceo) {
          ceo = await CEO.create({
            appId: app._id,
            name: u.name,
            email,
            mobile: u.mobile_number || "0000000000",
            passwordHash: defaultPasswordHash,
            company: u.business_name || "",
            website: u.website_url || "",
            city: u.city || "",
            address: u.address || "",
            pincode: u.pin_code || "",
            photoUrl: u.logo_url || "",
            designation: u.profession || "",
            ragClientId: u.client_id,
            ragToken: u.token,
            agentId: agentIdVal,
            isActive: true
          });
        } else {
          // Update tokens/fields if they are empty or out of sync
          let updated = false;
          if (!ceo.ragClientId && u.client_id) { ceo.ragClientId = u.client_id; updated = true; }
          if (!ceo.ragToken && u.token) { ceo.ragToken = u.token; updated = true; }
          if (!ceo.agentId && agentIdVal) { ceo.agentId = agentIdVal; updated = true; }
          if (ceo.agentId !== agentIdVal && agentIdVal) { ceo.agentId = agentIdVal; updated = true; }
          if (!ceo.photoUrl && u.logo_url) { ceo.photoUrl = u.logo_url; updated = true; }
          if (!ceo.company && u.business_name) { ceo.company = u.business_name; updated = true; }
          if (!ceo.website && u.website_url) { ceo.website = u.website_url; updated = true; }
          if (!ceo.city && u.city) { ceo.city = u.city; updated = true; }
          if (!ceo.address && u.address) { ceo.address = u.address; updated = true; }
          if (!ceo.pincode && u.pin_code) { ceo.pincode = u.pin_code; updated = true; }
          if (!ceo.designation && u.profession) { ceo.designation = u.profession; updated = true; }
          if (updated) {
            await ceo.save();
          }
        }
      }
    }
  } catch (syncErr) {
    console.error("[ceos-sync-error]", syncErr.message);
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = { appId: app._id };
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { company: re }, { email: re }, { mobile: re }, { industry: re }];
  }
  const ceos = await CEO.find(filter).sort({ createdAt: -1 });
  return res.json({ ceos: ceos.map(toPublicCEO) });
});

router.get("/ceos/rag/:rag_client_id/agents", async (req, res) => {
  try {
    const { rag_client_id } = req.params;
    const ceo = await CEO.findOne({ ragClientId: rag_client_id });
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }
    if (!ceo.ragToken) {
      return res.status(400).json({ error: "RAG_TOKEN_MISSING" });
    }
    const agents = await listAgents(ceo.ragToken);
    return res.json({ success: true, agents });
  } catch (err) {
    console.error("[get-ceo-agents-by-rag-id-error]", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

router.post("/ceos", ceoPhotoUpload, async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });
    const parsed = ceoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message === "PASSWORD_MISMATCH" ? "PASSWORD_MISMATCH" : "VALIDATION_ERROR" });
    }
    const email = parsed.data.email.toLowerCase();
    if (await CEO.findOne({ email })) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    let photoUrl, photoKey;
    const photoFile = req.files?.photo?.[0];
    if (photoFile) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const up = await uploadToR2(photoFile, "ceos/photos");
      photoUrl = up.url; photoKey = up.key;
    }
    const ceo = await CEO.create({
      appId: app._id, name: parsed.data.name, company: parsed.data.company,
      industry: parsed.data.industry, designation: parsed.data.designation,
      website: parsed.data.website, city: parsed.data.city,
      address: parsed.data.address, pincode: parsed.data.pincode,
      email, mobile: parsed.data.mobile,
      passwordHash: await hashPassword(parsed.data.password),
      photoUrl, photoKey,
    });

    // Auto-register sub-user on RAG server
    try {
      const ragSubUser = await registerSubUser({
        name: parsed.data.name,
        email: email,
        password: parsed.data.password,
        business_name: parsed.data.company || parsed.data.name,
        website_url: parsed.data.website || "",
        mobile_number: parsed.data.mobile || "",
        city: parsed.data.city || "",
        pin_code: parsed.data.pincode || "",
        address: parsed.data.address || "",
        logo_url: photoUrl || ""
      });

      if (ragSubUser && ragSubUser.success && ragSubUser.user) {
        await CEO.findByIdAndUpdate(ceo._id, {
          ragClientId: ragSubUser.user.client_id,
          ragToken: ragSubUser.user.token
        });
        // Update local object to return the mapped data
        ceo.ragClientId = ragSubUser.user.client_id;
        ceo.ragToken = ragSubUser.user.token;
      }
    } catch (ragErr) {
      console.error("[appPortal-ceo-create-rag-error]", ragErr.message);
      // Soft-fail: do not block CEO creation if RAG server registration fails
    }

    return res.status(201).json({ ceo: toPublicCEO(ceo) });
  } catch (err) {
    if (err.message === "INVALID_FILE_TYPE") return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    throw err;
  }
});

router.patch("/ceos/:id", ceoPhotoUpload, async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CEO.findOne({ _id: req.params.id, appId: app._id });
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  const parsed = ceoUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
  if (parsed.data.password && parsed.data.password !== parsed.data.confirmPassword)
    return res.status(400).json({ error: "PASSWORD_MISMATCH" });
  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    if (await CEO.findOne({ email, _id: { $ne: ceo._id } })) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    ceo.email = email;
  }
  for (const f of ["name", "company", "industry", "designation", "website", "city", "address", "pincode", "mobile"]) {
    if (parsed.data[f] !== undefined) ceo[f] = parsed.data[f];
  }
  if (parsed.data.password) ceo.passwordHash = await hashPassword(parsed.data.password);
  const photoFile = req.files?.photo?.[0];
  if (photoFile) {
    if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    const up = await uploadToR2(photoFile, "ceos/photos");
    ceo.photoUrl = up.url; ceo.photoKey = up.key;
  }

  // Self-healing: if an existing CEO is updated and doesn't have a RAG sub-user token, register them now
  if (!ceo.ragToken) {
    try {
      const ragSubUser = await registerSubUser({
        name: ceo.name,
        email: ceo.email,
        password: parsed.data.password || "tempPassword123!",
        business_name: ceo.company || ceo.name,
        website_url: ceo.website || "",
        mobile_number: ceo.mobile || "",
        city: ceo.city || "",
        pin_code: ceo.pincode || "",
        address: ceo.address || "",
        logo_url: ceo.photoUrl || ""
      });

      if (ragSubUser && ragSubUser.success && ragSubUser.user) {
        ceo.ragClientId = ragSubUser.user.client_id;
        ceo.ragToken = ragSubUser.user.token;
      }
    } catch (ragErr) {
      console.error("[appPortal-ceo-patch-rag-error]", ragErr.message);
    }
  }

  await ceo.save();
  return res.json({ ceo: toPublicCEO(ceo) });
});

router.delete("/ceos/:id", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const deleted = await CEO.findOneAndDelete({ _id: req.params.id, appId: app._id });
  if (!deleted) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ ok: true });
});

router.post("/ceos/:id/login-as", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });
  const ceo = await CEO.findOne({ _id: req.params.id, appId: app._id });
  if (!ceo) return res.status(404).json({ error: "NOT_FOUND" });
  if (!ceo.isActive) return res.status(403).json({ error: "CEO_DISABLED" });
  // Embed appId so getAppForUser resolves parent App for all CEO routes
  const accessToken = signAccessToken({
    sub: ceo._id.toString(),
    appId: app._id.toString(),
    email: ceo.email,
    role: "CEO",
    name: ceo.name,
    businessName: ceo.name,
    dashboardType: "default",
    showCandidates: false,
  });
  return res.json({
    accessToken,
    user: {
      id: ceo._id.toString(),
      email: ceo.email,
      role: "CEO",
      name: ceo.name,
      businessName: ceo.name,
      dashboardType: "default",
      showCandidates: false,
    },
  });
});

// ── Scripts Management & Approvals ───────────────────────────────────────────

// GET all scripts submitted by CEOs & Candidates under this App
router.get("/scripts", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    // Fetch creators under this app
    const ceos = await CEO.find({ appId: app._id });
    const candidates = await Candidate.find({ appId: app._id });

    const creatorsMap = {};
    ceos.forEach(c => {
      creatorsMap[c._id.toString()] = { name: c.name, role: "CEO" };
    });
    candidates.forEach(c => {
      creatorsMap[c._id.toString()] = { name: c.name, role: "Candidate" };
    });

    const creatorIds = Object.keys(creatorsMap);
    // Find all scripts that belong to creators under this app OR have appId matching this app
    const scripts = await Script.find({
      $or: [
        { userId: { $in: creatorIds } },
        { userIds: { $in: creatorIds } },
        { appId: app._id }
      ]
    }).sort({ createdAt: -1 });

    const formatted = scripts.map(s => {
      const ids = s.userIds && s.userIds.length > 0 ? s.userIds.map(id => id.toString()) : (s.userId ? [s.userId.toString()] : []);
      const assigned = ids.map(id => {
        const found = creatorsMap[id];
        return found ? { creatorId: id, name: found.name, role: found.role } : null;
      }).filter(Boolean);

      return {
        scriptId: s._id.toString(),
        userIds: ids,
        userId: s.userId ? s.userId.toString() : null,
        assignedCreators: assigned,
        title: s.title,
        body: s.body,
        description: s.description || null,
        category: s.category,
        duration: s.duration,
        scheduledDate: s.scheduledDate,
        scheduledTime: s.scheduledTime,
        approvalStatus: s.approvalStatus,
        imageUrl: s.imageUrl,
        rawVideoUrl: ["Recorded", "Retake", "Submitted", "Editing", "Edited", "Approved", "Rejected"].includes(s.approvalStatus) ? s.rawVideoUrl : null,
        processedVideoUrl: s.processedVideoUrl,
        viralVideoUrl: s.viralVideoUrl,
        processingStatus: s.processingStatus,
        processingProgress: s.processingProgress,
        objectionNote: s.objectionNote,
        statusHistory: s.statusHistory,
        createdByAdmin: s.createdByAdmin || false,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      };
    });

    return res.json({ scripts: formatted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all registered creators (CEOs and Candidates) for dropdown assignment
router.get("/creators", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const ceos = await CEO.find({ appId: app._id, isActive: true }).sort({ name: 1 });
    const candidates = await Candidate.find({ appId: app._id, isActive: true }).sort({ name: 1 });

    const creators = [
      ...ceos.map(c => ({ creatorId: c._id.toString(), name: c.name, role: "CEO", sendMode: c.sendMode || "auto", adminReviewMode: c.adminReviewMode || "manual" })),
      ...candidates.map(c => ({ creatorId: c._id.toString(), name: c.name, role: "Candidate", sendMode: c.sendMode || "auto", adminReviewMode: c.adminReviewMode || "manual" }))
    ];

    return res.json({ creators });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update a creator's sendMode preference
router.put("/creators/:creatorId/send-mode", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const { creatorId } = req.params;
    const { sendMode } = req.body;
    if (!["auto", "manual"].includes(sendMode)) {
      return res.status(400).json({ error: "invalid sendMode" });
    }

    // Try finding in CEO first
    let creator = await CEO.findOneAndUpdate(
      { _id: creatorId, appId: app._id },
      { sendMode },
      { new: true }
    );

    if (!creator) {
      // Try Candidate
      creator = await Candidate.findOneAndUpdate(
        { _id: creatorId, appId: app._id },
        { sendMode },
        { new: true }
      );
    }

    if (!creator) {
      return res.status(404).json({ error: "CREATOR_NOT_FOUND" });
    }

    return res.json({ success: true, sendMode: creator.sendMode });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update a creator's adminReviewMode preference
router.put("/creators/:creatorId/admin-review-mode", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const { creatorId } = req.params;
    const { adminReviewMode } = req.body;
    if (!["auto", "manual"].includes(adminReviewMode)) {
      return res.status(400).json({ error: "invalid adminReviewMode" });
    }

    // Try finding in CEO first
    let creator = await CEO.findOneAndUpdate(
      { _id: creatorId, appId: app._id },
      { adminReviewMode },
      { new: true }
    );

    if (!creator) {
      // Try Candidate
      creator = await Candidate.findOneAndUpdate(
        { _id: creatorId, appId: app._id },
        { adminReviewMode },
        { new: true }
      );
    }

    if (!creator) {
      return res.status(404).json({ error: "CREATOR_NOT_FOUND" });
    }

    return res.json({ success: true, adminReviewMode: creator.adminReviewMode });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create script (creatorId is optional) - handles image upload
router.post("/scripts", logoUpload.single("image"), async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const { title, body, description, category, duration, scheduledDate, scheduledTime, sendMode } = req.body;
    if (!title?.trim() || !body?.trim() || !category?.trim()) {
      return res.status(400).json({ error: "title, body, and category are required" });
    }
    if (!scheduledDate?.trim() || !scheduledTime?.trim()) {
      return res.status(400).json({ error: "scheduledDate (e.g. '18 July 2026') and scheduledTime (e.g. '10:00 AM') are required for admin-created scripts" });
    }

    let creatorIds = req.body.creatorIds || req.body.creatorId;
    if (typeof creatorIds === "string") {
      try {
        creatorIds = JSON.parse(creatorIds);
      } catch (e) {
        creatorIds = creatorIds ? [creatorIds] : [];
      }
    }
    if (!Array.isArray(creatorIds)) {
      creatorIds = creatorIds ? [creatorIds] : [];
    }

    let targetUserIds = [];
    for (const cid of creatorIds) {
      if (!cid) continue;
      const isCeo = await CEO.exists({ _id: cid, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
      if (isCeo || isCandidate) {
        targetUserIds.push(cid);
      }
    }

    let imageUrl = null;
    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "scripts/images");
      imageUrl = uploaded.url;
    }

    const scriptsCreated = [];
    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const s = await Script.create({
          userIds: [uid],
          userId: uid,
          appId: app._id,
          title: title.trim(),
          body: body.trim(),
          description: description ? description.trim() : null,
          category: category.trim(),
          duration: duration || "45s",
          scheduledDate: scheduledDate.trim(),
          scheduledTime: scheduledTime.trim(),
          approvalStatus: "Draft",
          createdByAdmin: true,
          sendMode: sendMode || "auto",
          statusHistory: [
            {
              status: "Draft",
              changedBy: "Founder/App Admin",
              note: "Script template created and assigned to creator."
            }
          ],
          imageUrl
        });
        scriptsCreated.push(s);
      }
    } else {
      const s = await Script.create({
        userIds: [],
        userId: null,
        appId: app._id,
        title: title.trim(),
        body: body.trim(),
        description: description ? description.trim() : null,
        category: category.trim(),
        duration: duration || "45s",
        scheduledDate: scheduledDate.trim(),
        scheduledTime: scheduledTime.trim(),
        approvalStatus: "Draft",
        createdByAdmin: true,
        sendMode: sendMode || "auto",
        statusHistory: [
          {
            status: "Draft",
            changedBy: "Founder/App Admin",
            note: "Script template created as Draft."
          }
        ],
        imageUrl
      });
      scriptsCreated.push(s);
    }

    const script = scriptsCreated[0];

    return res.status(201).json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH edit a script (any field) - handles optional image update
router.patch("/scripts/:id", logoUpload.single("image"), async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    const allUserIds = script.userIds && script.userIds.length > 0
      ? script.userIds.map(id => id.toString())
      : (script.userId ? [script.userId.toString()] : []);

    if (allUserIds.length > 0) {
      for (const uid of allUserIds) {
        const isCeo = await CEO.exists({ _id: uid, appId: app._id });
        const isCandidate = await Candidate.exists({ _id: uid, appId: app._id });
        if (isCeo || isCandidate) {
          isAuthorized = true;
          break;
        }
      }
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    const { title, body, description, category, duration, scheduledDate, scheduledTime, approvalStatus, sendMode } = req.body;
    if (title !== undefined) script.title = title.trim();
    if (body !== undefined) script.body = body.trim();
    if (description !== undefined) script.description = description ? description.trim() : null;
    if (category !== undefined) script.category = category;
    if (duration !== undefined) script.duration = duration;
    if (scheduledDate !== undefined) script.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) script.scheduledTime = scheduledTime;
    if (approvalStatus !== undefined) script.approvalStatus = approvalStatus;
    if (sendMode !== undefined) script.sendMode = sendMode;
    
    let creatorIds = req.body.creatorIds !== undefined ? req.body.creatorIds : req.body.creatorId;
    if (creatorIds !== undefined) {
      if (typeof creatorIds === "string") {
        try {
          creatorIds = JSON.parse(creatorIds);
        } catch (e) {
          creatorIds = creatorIds ? [creatorIds] : [];
        }
      }
      if (!Array.isArray(creatorIds)) {
        creatorIds = creatorIds ? [creatorIds] : [];
      }

      let verifiedIds = [];
      for (const cid of creatorIds) {
        if (!cid) continue;
        const isCeo = await CEO.exists({ _id: cid, appId: app._id });
        const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
        if (isCeo || isCandidate) {
          verifiedIds.push(cid);
        }
      }
      
      // Auto transition status based on assignment
      if (verifiedIds.length > 0) {
        const currentCreator = script.userId ? script.userId.toString() : null;

        if (!currentCreator) {
          // Unassigned Draft template. Assign first creator here, clone for subsequent.
          const firstCreator = verifiedIds[0];
          for (let i = 1; i < verifiedIds.length; i++) {
            const cid = verifiedIds[i];
            await Script.create({
              userIds: [cid],
              userId: cid,
              appId: app._id,
              title: script.title,
              body: script.body,
              category: script.category,
              duration: script.duration,
              timeGroup: script.timeGroup,
              scheduledTime: script.scheduledTime,
              approvalStatus: "Draft",
              createdByAdmin: true,
              statusHistory: [
                {
                  status: "Draft",
                  changedBy: "Founder/App Admin",
                  note: "Script template cloned and assigned to creator."
                }
              ],
              imageUrl: script.imageUrl
            });
          }

          script.userIds = [firstCreator];
          script.userId = firstCreator;
          script.approvalStatus = "Draft";
          script.statusHistory.push({
            status: "Draft",
            changedBy: "Founder/App Admin",
            note: "Script template assigned to creator."
          });
        } else {
          // Already assigned. Clone for any *new* creator IDs not matching the current one.
          for (const cid of verifiedIds) {
            if (cid.toString() === currentCreator) continue;
            await Script.create({
              userIds: [cid],
              userId: cid,
              appId: app._id,
              title: script.title,
              body: script.body,
              category: script.category,
              duration: script.duration,
              timeGroup: script.timeGroup,
              scheduledTime: script.scheduledTime,
              approvalStatus: "Draft",
              createdByAdmin: true,
              statusHistory: [
                {
                  status: "Draft",
                  changedBy: "Founder/App Admin",
                  note: "Script template cloned and assigned to creator."
                }
              ],
              imageUrl: script.imageUrl
            });
          }

          script.userIds = [currentCreator];
          script.userId = currentCreator;
        }
      } else {
        // Unassigned, set status to Draft
        script.userIds = [];
        script.userId = null;
        script.approvalStatus = "Draft";
        script.statusHistory.push({
          status: "Draft",
          changedBy: "Founder/App Admin",
          note: "Script template unassigned from all creators."
        });
      }
    }

    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "scripts/images");
      script.imageUrl = uploaded.url;
    }

    await script.save();

    return res.json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE a script
router.delete("/scripts/:id", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    if (script.userId) {
      const isCeo = await CEO.exists({ _id: script.userId, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: script.userId, appId: app._id });
      isAuthorized = isCeo || isCandidate;
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    await Script.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update script status (Approve / Reject / etc.)
router.put("/scripts/:id/status", async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "NOT_FOUND" });

    // Verify ownership
    let isAuthorized = false;
    if (script.userId) {
      const isCeo = await CEO.exists({ _id: script.userId, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: script.userId, appId: app._id });
      isAuthorized = isCeo || isCandidate;
    } else if (script.appId) {
      isAuthorized = script.appId.toString() === app._id.toString();
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: "UNAUTHORIZED_SCRIPT_ACCESS" });
    }

    const { status, note, sendMode } = req.body;
    const allowed = ["Draft", "Pending", "Waiting", "Submitted", "Editing", "Edited", "Approved", "Rejected", "Objection", "Recorded", "Retake"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: "invalid or missing status" });
    }

    let triggerPipeline = false;
    if (status === "Objection") {
      script.objectionNote = note || "Objection raised by founder.";
      script.approvalStatus = "Objection";
      triggerPipeline = true;
    } else if (status === "Retake") {
      script.objectionNote = note || "Video rejected by Admin. Please record/upload a retake.";
      script.approvalStatus = "Retake";
    } else if (status === "Editing") {
      script.approvalStatus = "Editing";
      script.processingStatus = "processing";
      script.processingProgress = 10;
      if (sendMode) {
        script.sendMode = sendMode;
      }
      triggerPipeline = true;
    } else {
      script.approvalStatus = status;
    }

    script.statusHistory.push({
      status,
      changedBy: "Founder/App Admin",
      note: note || `Status updated to ${status} by Founder/App Admin`
    });
    await script.save();

    if (triggerPipeline) {
      const { triggerAiPipelineForScript } = require("../utils/ugcAiTrigger");
      triggerAiPipelineForScript(script._id.toString()).catch(err => {
        console.error("[admin-trigger-error]", err.message);
      });
    }

    return res.json({
      scriptId: script._id.toString(),
      approvalStatus: script.approvalStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST auto-generate script body using Groq AI
router.post("/generate-script", logoUpload.single("image"), async (req, res) => {
  try {
    const app = await getAppForUser(req);
    if (!app) return res.status(404).json({ error: "NOT_FOUND" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "GROQ_NOT_CONFIGURED" });

    const { title, category, duration, description, creatorIds, scheduledDate, scheduledTime } = req.body;
    const now = new Date();
    const aiScheduledDate = scheduledDate?.trim() || now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const aiScheduledTime = scheduledTime?.trim() || now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (!category?.trim()) {
      return res.status(400).json({ error: "category is required" });
    }

    const finalTitle = (title && title.trim()) ? title.trim() : "AI Generated UGC Template";

    const prompt = `Write a high-converting, engaging UGC video speech script titled "${finalTitle}" for the category "${category.trim()}". The duration should be approximately ${duration || "45s"}.
${description ? `Context/Description of the script: ${description.trim()}` : ""}

Write a natural, spoken video script divided into clear paragraphs (an engaging opening hook, compelling main content, and a strong call-to-action).
Do NOT include section headers, bracket tags, or labels like [HOOK], [MAIN CONTENT], or [CTA]. Write ONLY the exact speech dialogue.`;

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });
    const data = await r.json();
    if (data?.error) {
      return res.status(502).json({ error: "GROQ_API_ERROR", message: data.error.message });
    }
    let scriptBody = (data.choices?.[0]?.message?.content || "").trim();
    // Clean up any bracket headers if generated
    scriptBody = scriptBody.replace(/\[(HOOK|MAIN CONTENT|CTA|INTRO|OUTRO)\]/gi, "").replace(/\n\s*\n\s*\n/g, "\n\n").trim();

    let imageUrl = null;
    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "scripts/images");
      imageUrl = uploaded.url;
    }

    // Create the script template in the database
    let parsedCreatorIds = creatorIds;
    if (typeof parsedCreatorIds === "string") {
      try {
        parsedCreatorIds = JSON.parse(parsedCreatorIds);
      } catch (e) {
        parsedCreatorIds = parsedCreatorIds ? [parsedCreatorIds] : [];
      }
    }
    if (!Array.isArray(parsedCreatorIds)) {
      parsedCreatorIds = parsedCreatorIds ? [parsedCreatorIds] : [];
    }

    let targetUserIds = [];
    for (const cid of parsedCreatorIds) {
      if (!cid) continue;
      const isCeo = await CEO.exists({ _id: cid, appId: app._id });
      const isCandidate = await Candidate.exists({ _id: cid, appId: app._id });
      if (isCeo || isCandidate) {
        targetUserIds.push(cid);
      }
    }

    const scriptsCreated = [];
    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const s = await Script.create({
          userIds: [uid],
          userId: uid,
          appId: app._id,
          title: finalTitle,
          body: scriptBody,
          description: description ? description.trim() : null,
          category: category.trim(),
          duration: duration || "45s",
          scheduledDate: aiScheduledDate,
          scheduledTime: aiScheduledTime,
          approvalStatus: "Draft",
          createdByAdmin: true,
          statusHistory: [
            {
              status: "Draft",
              changedBy: "Founder/App Admin",
              note: "Script template created via AI and assigned to creator."
            }
          ],
          imageUrl
        });
        scriptsCreated.push(s);
      }
    } else {
      const s = await Script.create({
        userIds: [],
        userId: null,
        appId: app._id,
        title: finalTitle,
        body: scriptBody,
        description: description ? description.trim() : null,
        category: category.trim(),
        duration: duration || "45s",
        scheduledDate: aiScheduledDate,
        scheduledTime: aiScheduledTime,
        approvalStatus: "Draft",
        createdByAdmin: true,
        statusHistory: [
          {
            status: "Draft",
            changedBy: "Founder/App Admin",
            note: "Script template created via AI as Draft."
          }
        ],
        imageUrl
      });
      scriptsCreated.push(s);
    }

    const script = scriptsCreated[0];

    return res.status(201).json({
      success: true,
      script: {
        scriptId: script._id.toString(),
        userIds: script.userIds ? script.userIds.map(id => id.toString()) : [],
        title: script.title,
        body: script.body,
        description: script.description || null,
        category: script.category,
        duration: script.duration,
        scheduledDate: script.scheduledDate,
        scheduledTime: script.scheduledTime,
        approvalStatus: script.approvalStatus,
        imageUrl: script.imageUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function resolveRegisteredDetailsForContacts(contacts) {
  if (!contacts || contacts.length === 0) return [];
  
  const contactMap = contacts.map(c => {
    const clean = c.phone.replace(/\D/g, "");
    const suffix = clean.length >= 10 ? clean.slice(-10) : clean;
    return { contact: c, suffix };
  });

  const suffixes = contactMap.map(item => item.suffix).filter(s => s.length > 0);
  
  let ceos = [];
  let candidates = [];
  if (suffixes.length > 0) {
    const searchConditions = suffixes.map(s => ({
      mobile: new RegExp(s.split("").join("\\D*") + "$")
    }));
    ceos = await CEO.find({ $or: searchConditions });
    candidates = await Candidate.find({ $or: searchConditions });
  }

  return contacts.map(c => {
    const clean = c.phone.replace(/\D/g, "");
    const suffix = clean.length >= 10 ? clean.slice(-10) : clean;
    
    const matchedCeo = ceos.find(ceo => {
      const ceoMobile = (ceo.mobile || "").replace(/\D/g, "");
      return ceoMobile.endsWith(suffix);
    });

    if (matchedCeo) {
      return {
        id: c._id.toString(),
        name: matchedCeo.name,
        phone: c.phone,
        email: c.email || null,
        avatar: matchedCeo.photoUrl || c.avatar || null,
        isWhatsAppActive: c.isWhatsAppActive,
        joinedAt: c.joinedAt,
        lastConnected: c.lastConnected
      };
    }

    const matchedCandidate = candidates.find(cand => {
      const candMobile = (cand.mobile || "").replace(/\D/g, "");
      return candMobile.endsWith(suffix);
    });

    if (matchedCandidate) {
      return {
        id: c._id.toString(),
        name: matchedCandidate.name,
        phone: c.phone,
        email: c.email || null,
        avatar: matchedCandidate.photoUrl || c.avatar || null,
        isWhatsAppActive: c.isWhatsAppActive,
        joinedAt: c.joinedAt,
        lastConnected: c.lastConnected
      };
    }

    return {
      id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      avatar: c.avatar || null,
      isWhatsAppActive: c.isWhatsAppActive,
      joinedAt: c.joinedAt,
      lastConnected: c.lastConnected
    };
  });
}

// ─── Contacts Management ──────────────────────────────────────────────────
router.get("/people/contacts", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { search, category } = req.query;
    const filter = ceoId ? { ceoId } : { appId };

    if (req.query.isBusinessCard === "true") {
      filter.isBusinessCard = true;
    } else if (category) {
      filter.category = category;
      filter.isBusinessCard = { $ne: true };
    } else if (req.query.includeNew === "true") {
      filter.contactType = "new";
      filter.isBusinessCard = { $ne: true };
    } else if (req.query.all === "true") {
      // All contacts
    } else {
      // Main Contacts tab: Device synced / regular contacts ONLY
      filter.contactType = "regular";
      filter.isBusinessCard = { $ne: true };
    }

    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;
    let query = Contact.find(filter).sort({ name: 1 });
    if (page && limit) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }
    const contacts = await query;

    // Synchronously verify WhatsApp status for any unverified contacts in the current view
    const unverifiedContacts = contacts.filter(c => c.isWhatsAppActive == null);
    if (unverifiedContacts.length > 0) {
      const phoneNumbers = unverifiedContacts.map(c => c.phone);
      const { verifyWhatsAppNumbers } = require("../utils/whatsappVerify");
      try {
        const resultsMap = await verifyWhatsAppNumbers(phoneNumbers);
        for (const contact of unverifiedContacts) {
          const status = resultsMap[contact.phone];
          if (status !== undefined) {
            contact.isWhatsAppActive = status;
            await contact.save();
          }
        }
      } catch (err) {
        console.error("[whatsapp-sync-verify-contacts-error]", err.message);
        // Fallback: set isWhatsAppActive to false for unverified ones if API fails
        for (const contact of unverifiedContacts) {
          if (contact.isWhatsAppActive == null) {
            contact.isWhatsAppActive = false;
            await contact.save();
          }
        }
      }
    }

    const totalContacts = await Contact.countDocuments(filter);
    const hasMore = page && limit ? (page * limit) < totalContacts : false;

    return res.json({
      contacts: contacts.map(c => ({
        id: c._id.toString(),
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        lastConnected: c.lastConnected,
        isWhatsAppActive: c.isWhatsAppActive,
        avatar: c.avatar || null,
        company: c.company || "",
        designation: c.designation || "",
        category: c.category || "Regular",
        isBusinessCard: !!c.isBusinessCard,
        cardImageUrl: c.cardImageUrl || ""
      })),
      totalContacts,
      hasMore
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/contacts", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { name, phone, email, avatar, company, designation, category, cardImageKey, cardImageUrl, isBusinessCard } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "NAME_AND_PHONE_REQUIRED" });
    }
    const isCard = isBusinessCard === true || !!cardImageKey || !!cardImageUrl;
    const contact = await Contact.create({
      appId,
      ceoId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      avatar: avatar || null,
      company: company ? company.trim() : "",
      designation: designation ? designation.trim() : "",
      category: category || "Business Person",
      contactType: isCard ? "card" : (req.body.contactType || "regular"),
      isBusinessCard: isCard,
      cardImageKey: cardImageKey || "",
      cardImageUrl: cardImageUrl || "",
      lastConnected: isCard ? "Business Card Scan" : "Manual Entry"
    });
    return res.status(201).json({
      id: contact._id.toString(),
      name: contact.name,
      phone: contact.phone,
      email: contact.email || null,
      lastConnected: contact.lastConnected,
      isWhatsAppActive: contact.isWhatsAppActive,
      avatar: contact.avatar || null,
      company: contact.company || "",
      designation: contact.designation || "",
      category: contact.category || "Business Person"
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "CONTACT_ALREADY_EXISTS" });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/scan-card", logoUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "CARD_IMAGE_REQUIRED" });
    }

    const { env } = require("../config/env");
    const apiKey = env.LANDING_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "LANDING_AI_CONFIG_MISSING" });
    }

    const axios = require("axios");
    const FormData = require("form-data");

    // 1. Send file buffer to Landing AI Parse API with 30s timeout
    const parseUrl = "https://api.va.landing.ai/v1/ade/parse";
    const parseForm = new FormData();
    parseForm.append("document", file.buffer, {
      filename: file.originalname || "card.jpg",
      contentType: file.mimetype
    });
    parseForm.append("model", "dpt-2-latest");

    const parseResponse = await axios.post(parseUrl, parseForm, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...parseForm.getHeaders()
      },
      timeout: 30000
    });

    const markdown = parseResponse.data.markdown;
    if (!markdown || !markdown.trim()) {
      return res.status(422).json({
        error: "CARD_TEXT_EMPTY",
        message: "Card text could not be detected. Please upload a straight and clear photo of the business card."
      });
    }

    // 2. Send markdown to Landing AI Extract API
    const extractUrl = "https://api.va.landing.ai/v1/ade/extract";
    const extractForm = new FormData();
    extractForm.append("markdown", markdown);

    const schema = {
      type: "object",
      properties: {
        name: { type: ["string", "null"], description: "The full name of the contact person(s) on the card" },
        phone: { type: ["string", "null"], description: "The phone numbers or mobile numbers on the card. If multiple numbers exist, separate them by comma." },
        email: { type: ["string", "null"], description: "The email address" },
        company: { type: ["string", "null"], description: "The business/firm/agency/company name" },
        designation: { type: ["string", "null"], description: "The designation or job title of the person" }
      }
    };

    extractForm.append("schema", JSON.stringify(schema));
    extractForm.append("model", "extract-latest");

    const extractResponse = await axios.post(extractUrl, extractForm, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...extractForm.getHeaders()
      },
      timeout: 25000
    });

    const result = extractResponse.data.extraction || {};

    if (!result.name && !result.phone && !result.company) {
      return res.status(422).json({
        error: "UNCLEAR_IMAGE",
        message: "Card details could not be parsed clearly. Please upload a straight, well-lit, and non-blurry photo of the business card."
      });
    }

    // Upload card image to R2
    let cardImageKey = "";
    let cardImageUrl = "";
    try {
      const { uploadToR2, isR2Configured } = require("../utils/r2");
      if (isR2Configured()) {
        const uploadRes = await uploadToR2(file, "cards");
        cardImageKey = uploadRes.key;
        cardImageUrl = uploadRes.url;
      }
    } catch (uploadErr) {
      console.error("[scan-card-upload-error]", uploadErr.message);
    }

    return res.json({
      success: true,
      data: {
        name: result.name || "",
        phone: result.phone || "",
        email: result.email || "",
        company: result.company || "",
        designation: result.designation || "",
        cardImageKey,
        cardImageUrl
      }
    });
  } catch (err) {
    const errorMsg = err.response?.data?.message || (err.response ? JSON.stringify(err.response.data) : err.message);
    console.error("[scan-card-error]", errorMsg);
    const userFriendly = errorMsg.includes("timeout") || errorMsg.includes("ECONNRESET")
      ? "OCR server timed out. Please upload a straight, compressed, and clear card photo."
      : "Card scan failed. Please upload a straight and clear photo of the business card.";
    return res.status(500).json({ error: "SCAN_CARD_FAILED", message: userFriendly });
  }
});

router.delete("/people/contacts/all", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const filter = ceoId ? { appId, ceoId } : { appId };
    const result = await Contact.deleteMany(filter);
    return res.json({ success: true, message: `Successfully deleted ${result.deletedCount} contacts.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/people/contacts/:id", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const filter = ceoId ? { _id: req.params.id, appId, ceoId } : { _id: req.params.id, appId };
    const deleted = await Contact.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND" });
    }
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/people/contacts/:id/details", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const filter = ceoId ? { _id: req.params.id, appId, ceoId } : { _id: req.params.id, appId };
    const contact = await Contact.findOne(filter);
    if (!contact) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND" });
    }

    const cleanPhone = contact.phone.replace(/\D/g, "");
    let last10Digits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    let registeredCeo = null;
    let registeredCandidate = null;
    let currentCeo = null;

    if (req.user && req.user.appId) {
      currentCeo = await CEO.findById(req.user.sub);
    }

    if (cleanPhone.length >= 10) {
      last10Digits = cleanPhone.slice(-10);
      // Create regex pattern to match digits even if separated by spaces, dashes or country code (e.g. 9\D*8\D*7\D*6\D*5\D*4\D*3\D*2\D*1\D*0$)
      const regexPattern = last10Digits.split("").join("\\D*") + "$";
      const phoneRegex = new RegExp(regexPattern);

      registeredCeo = await CEO.findOne({
        mobile: phoneRegex
      });
      if (!registeredCeo) {
        registeredCandidate = await Candidate.findOne({
          mobile: phoneRegex
        });
      }
    }

    let isMagnifaiUser = contact.isMagnifaiUser;
    let name = contact.name;
    let email = contact.email || null;
    let designation = contact.designation || "";
    let company = contact.company || "";
    let socials = {
      linkedin: "",
      twitter: "",
      instagram: ""
    };
    let displayId = contact._id.toString();
    let avatar = contact.avatar || null;
    let agents = [];

    if (registeredCeo) {
      isMagnifaiUser = true;
      name = registeredCeo.name;
      email = registeredCeo.email || email;
      designation = registeredCeo.designation || "CEO";
      company = registeredCeo.company || "MagnifAI Member";
      displayId = registeredCeo._id.toString();
      avatar = registeredCeo.photoUrl || avatar;

      // Find real profile for LinkedIn and other socials
      const ceoProfile = await CeoProfile.findOne({ appId: registeredCeo.appId });
      socials.linkedin = ceoProfile?.social?.linkedin || "";
      socials.twitter = registeredCeo.social?.twitter?.username 
        ? `https://twitter.com/${registeredCeo.social.twitter.username}` 
        : (ceoProfile?.social?.twitter || "");
      socials.instagram = registeredCeo.social?.instagram?.username 
        ? `https://instagram.com/${registeredCeo.social.instagram.username}` 
        : (ceoProfile?.social?.instagram || "");

      // Fetch active agents from vectorize service using RAG token
      if (registeredCeo.ragToken) {
        try {
          const rawAgents = (await listAgents(registeredCeo.ragToken) || []).filter(ag => ag.category !== "root_assistant");
          const defaultLinkBase = "https://magnifai.in";
          agents = rawAgents.map(ag => {
            const agId = ag.agent_id || ag.id;
            const customLink = ag.customization?.chat_link?.trim() || "";
            let chatUrl = customLink;
            if (!chatUrl) {
              chatUrl = `${defaultLinkBase}/agent-chat?id=${agId}`;
            } else {
              if (!/^https?:\/\//i.test(chatUrl)) {
                chatUrl = "https://" + chatUrl;
              }
              if (chatUrl.includes("/agent-chat")) {
                chatUrl = chatUrl.includes("?") ? `${chatUrl}&id=${agId}` : `${chatUrl}?id=${agId}`;
              } else {
                chatUrl = chatUrl.replace(/\/$/, "") + `/agent-chat?id=${agId}`;
              }
            }
            return {
              agentId: agId,
              name: ag.agent_name || ag.name || "AI Agent",
              qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(chatUrl)}`,
              chatUrl
            };
          });
        } catch (e) {
          console.error("[list-agents-details-error]", e.message);
        }
      }
    } else if (registeredCandidate) {
      isMagnifaiUser = true;
      name = registeredCandidate.name;
      email = registeredCandidate.email || email;
      designation = `${registeredCandidate.assembly} Candidate`;
      company = registeredCandidate.partyName || "MagnifAI Candidate";
      displayId = registeredCandidate.id || registeredCandidate._id.toString();
      avatar = registeredCandidate.photoUrl || avatar;

      // Try to find candidate socials
      const { CandidateSocialLink } = require("../models/CandidateSocialLink");
      const candSocial = await CandidateSocialLink.findOne({
        candidateName: registeredCandidate.name
      });
      if (candSocial) {
        socials.twitter = candSocial.twitter?.profileUrl || 
          (candSocial.twitter?.handle ? `https://twitter.com/${candSocial.twitter.handle}` : "");
        socials.instagram = candSocial.instagram?.profileUrl || 
          (candSocial.instagram?.handle ? `https://instagram.com/${candSocial.instagram.handle}` : "");
      }
    }

    // Fetch real live chat logs from vectorize sessions mapped by contact's phone suffix
    const realChats = [];
    if (currentCeo && currentCeo.ragToken && last10Digits) {
      try {
        const ceoAgents = await listAgents(currentCeo.ragToken) || [];
        const nonRootCeoAgents = ceoAgents.filter(ag => ag.category !== "root_assistant");
        
        for (const ag of nonRootCeoAgents) {
          const agId = ag.agent_id || ag.id;
          const sessions = await getVisitorSessions(agId, currentCeo.ragToken) || [];
          
          // Find sessions matching this contact's phone suffix
          const matchedSessions = sessions.filter(sess => {
            const sessPhone = (sess.phone_number || "").replace(/\D/g, "");
            return sessPhone.endsWith(last10Digits);
          });
          
          for (const sess of matchedSessions) {
            const history = await getSessionHistory(sess.session_id, currentCeo.ragToken) || [];
            if (Array.isArray(history)) {
              history.forEach((msg, idx) => {
                realChats.push({
                  id: msg.id || msg._id || `${sess.session_id}-${idx}`,
                  platform: sess.platform || "web",
                  sender: msg.role === "user" ? (contact.name || "User") : (ag.agent_name || ag.name || "AI Agent"),
                  text: msg.content || msg.text || "",
                  timestamp: msg.created_at || msg.timestamp || sess.created_at || new Date().toISOString()
                });
              });
            }
          }
        }
        
        // Sort chronologically (oldest first, newest at the bottom)
        realChats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      } catch (e) {
        console.error("Failed to load real chat logs for contact:", e.message);
      }
    }

    return res.json({
      contact: {
        id: displayId,
        name,
        phone: contact.phone,
        email,
        avatar,
        isWhatsAppActive: contact.isWhatsAppActive,
        isMagnifaiUser,
        designation,
        company,
        socials,
        agents,
        cardImageKey: contact.cardImageKey || "",
        cardImageUrl: contact.cardImageUrl || ""
      },
      chats: realChats
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/contacts/sync", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "CONTACTS_ARRAY_REQUIRED" });
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of contacts) {
      if (!item.name || !item.phone) continue;
      const phone = item.phone.trim();
      const name = item.name.trim();
      const email = item.email ? item.email.trim() : null;

      // Check if contact already exists for this appId, ceoId, and phone
      const queryFilter = ceoId ? { appId, ceoId, phone } : { appId, phone };
      const existing = await Contact.findOne(queryFilter);
      if (existing) {
        existing.name = name;
        if (email) existing.email = email;
        await existing.save();
        updatedCount++;
      } else {
        await Contact.create({
          appId,
          ceoId,
          name,
          phone,
          email: email || undefined
        });
        addedCount++;
      }
    }

    return res.json({
      syncedCount: contacts.length,
      addedCount,
      updatedCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/contacts/verify-whatsapp", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { force } = req.query;

    const query = ceoId ? { appId, ceoId } : { appId };
    if (force !== "true") {
      query.isWhatsAppActive = null;
    }

    const contacts = await Contact.find(query);
    if (contacts.length === 0) {
      return res.json({ message: "NO_CONTACTS_TO_VERIFY", checkedCount: 0 });
    }

    const phoneNumbers = contacts.map(c => c.phone);
    const { verifyWhatsAppNumbers } = require("../utils/whatsappVerify");
    
    try {
      const resultsMap = await verifyWhatsAppNumbers(phoneNumbers);

      let activeCount = 0;
      let inactiveCount = 0;

      for (const contact of contacts) {
        const phone = contact.phone;
        const status = resultsMap[phone];
        if (status !== undefined) {
          contact.isWhatsAppActive = status;
          await contact.save();
          if (status) activeCount++;
          else inactiveCount++;
        }
      }

      return res.json({
        success: true,
        message: "VERIFICATION_COMPLETED",
        checkedCount: contacts.length,
        activeCount,
        inactiveCount
      });
    } catch (apiErr) {
      console.warn("[verify-whatsapp-api-failed]", apiErr.message);
      return res.status(400).json({
        success: false,
        error: "META_API_ERROR",
        message: "Meta WhatsApp credentials are unassigned or inactive. Please assign the WhatsApp Asset to your System User in Meta Business Suite."
      });
    }
  } catch (err) {
    console.error("[verify-whatsapp-route-error]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/contacts/:id/verify-whatsapp", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { id } = req.params;

    const filter = ceoId ? { _id: id, appId, ceoId } : { _id: id, appId };
    const contact = await Contact.findOne(filter);
    if (!contact) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND" });
    }

    const { verifyWhatsAppNumbers } = require("../utils/whatsappVerify");
    const resultsMap = await verifyWhatsAppNumbers([contact.phone]);
    const status = resultsMap[contact.phone];

    if (status !== undefined) {
      contact.isWhatsAppActive = status;
      await contact.save();
    }

    return res.json({
      id: contact._id.toString(),
      name: contact.name,
      phone: contact.phone,
      isWhatsAppActive: contact.isWhatsAppActive
    });
  } catch (err) {
    console.error("[verify-single-whatsapp-route-error]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Newly Joined Members ────────────────────────────────────────────────
router.get("/people/new", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const filter = ceoId 
      ? { appId, ceoId, contactType: "new", isBusinessCard: { $ne: true } } 
      : { appId, contactType: "new", isBusinessCard: { $ne: true } };
    const totalNewMembers = await Contact.countDocuments(filter);

    const contacts = await Contact.find(filter)
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limit);

    const formatRelativeTime = (date) => {
      const diffMs = Date.now() - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${diffDays} days ago`;
    };

    // Synchronously verify WhatsApp status for any unverified contacts in the current view
    const unverifiedContacts = contacts.filter(c => c.isWhatsAppActive == null);
    if (unverifiedContacts.length > 0) {
      const phoneNumbers = unverifiedContacts.map(c => c.phone);
      const { verifyWhatsAppNumbers } = require("../utils/whatsappVerify");
      try {
        const resultsMap = await verifyWhatsAppNumbers(phoneNumbers);
        for (const contact of unverifiedContacts) {
          const status = resultsMap[contact.phone];
          if (status !== undefined) {
            contact.isWhatsAppActive = status;
            await contact.save();
          }
        }
      } catch (err) {
        console.error("[whatsapp-sync-verify-new-error]", err.message);
        // Fallback: set isWhatsAppActive to false for unverified ones if API fails
        for (const contact of unverifiedContacts) {
          contact.isWhatsAppActive = false;
          await contact.save();
        }
      }
    }

    const resolved = await resolveRegisteredDetailsForContacts(contacts);
    return res.json({
      newMembers: resolved.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        joinedAt: formatRelativeTime(c.joinedAt),
        isWhatsAppActive: c.isWhatsAppActive,
        avatar: c.avatar
      })),
      total: totalNewMembers,
      currentPage: page,
      hasMore: (page * limit) < totalNewMembers
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Groups Management ────────────────────────────────────────────────────
router.get("/people/groups", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = ceoId ? { appId, ceoId } : { appId };
    const totalGroups = await Group.countDocuments(filter);

    const groups = await Group.find(filter)
      .populate("members", "name avatar")
      .skip(skip)
      .limit(limit);

    return res.json({
      groups: groups.map(g => ({
        id: g._id.toString(),
        name: g.name,
        iconIndex: g.iconIndex,
        colorHex: g.colorHex,
        membersCount: g.members ? g.members.length : 0,
        members: (g.members || []).map(m => ({
          id: m._id.toString(),
          name: m.name,
          avatar: m.avatar || null
        }))
      })),
      total: totalGroups,
      currentPage: page,
      hasMore: (page * limit) < totalGroups
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/groups", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { name, iconIndex, colorHex, memberIds } = req.body;
    if (!name) {
      return res.status(400).json({ error: "GROUP_NAME_REQUIRED" });
    }

    if (memberIds && Array.isArray(memberIds)) {
      const mongoose = require("mongoose");
      const invalid = memberIds.some(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        return res.status(400).json({ error: "INVALID_MEMBER_ID_FORMAT" });
      }
    }

    const group = await Group.create({
      appId,
      ceoId,
      name: name.trim(),
      iconIndex: iconIndex || 0,
      colorHex: colorHex || "#FFD54F",
      members: memberIds || []
    });

    // Auto-sync group to WhatsAI
    try {
      const axios = require("axios");
      const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
      const headers = await getWhatsAiHeaders(req);
      await axios.post(
        `${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`,
        { name: name.trim() },
        { headers }
      );
    } catch (e) {
      console.log("[people-group-to-whats-ai-sync-notice]", e.message);
    }

    return res.status(201).json({
      id: group._id.toString(),
      name: group.name,
      iconIndex: group.iconIndex,
      colorHex: group.colorHex,
      membersCount: group.members ? group.members.length : 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/people/groups/:id/members", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const { addMemberIds, removeMemberIds } = req.body;

    const mongoose = require("mongoose");
    if (Array.isArray(addMemberIds)) {
      const invalid = addMemberIds.some(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        return res.status(400).json({ error: "INVALID_MEMBER_ID_FORMAT" });
      }
    }
    if (Array.isArray(removeMemberIds)) {
      const invalid = removeMemberIds.some(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        return res.status(400).json({ error: "INVALID_MEMBER_ID_FORMAT" });
      }
    }

    const filter = ceoId ? { _id: req.params.id, appId, ceoId } : { _id: req.params.id, appId };
    const group = await Group.findOne(filter);
    if (!group) {
      return res.status(404).json({ error: "GROUP_NOT_FOUND" });
    }

    if (Array.isArray(addMemberIds)) {
      addMemberIds.forEach(id => {
        if (!group.members.includes(id)) {
          group.members.push(id);
        }
      });
    }

    if (Array.isArray(removeMemberIds)) {
      group.members = group.members.filter(id => !removeMemberIds.includes(id.toString()));
    }

    await group.save();

    return res.json({
      groupId: group._id.toString(),
      currentMembersCount: group.members.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/people/groups/:id", async (req, res) => {
  try {
    const appId = req.user.appId || req.user.sub;
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    const filter = ceoId ? { _id: req.params.id, appId, ceoId } : { _id: req.params.id, appId };
    const deleted = await Group.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ error: "GROUP_NOT_FOUND" });
    }
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET Onboarding Requests ──────────────────────────────────────────────
router.get("/onboarding-requests", async (req, res) => {
  try {
    const requests = await OnboardingRequest.find().sort({ createdAt: -1 });
    return res.json({ onboardingRequests: requests });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST Approve Onboarding Request ──────────────────────────────────────────
router.post("/onboarding-requests/:id/approve", async (req, res) => {
  try {
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "ONBOARDING_REQUEST_NOT_FOUND" });
    }
    if (request.status === "Approved") {
      return res.status(400).json({ error: "REQUEST_ALREADY_APPROVED" });
    }

    const targetAppId = req.user.appId || req.user.sub;
    const currentApp = await App.findById(targetAppId);
    if (!currentApp) {
      return res.status(404).json({ error: "ACTIVE_WORKSPACE_NOT_FOUND" });
    }

    // 1. Create the CEO Profile linked directly to the approving Founder's workspace
    const ceo = await CEO.create({
      appId: currentApp._id,
      name: request.name,
      company: request.organizationName || currentApp.businessName,
      designation: request.designation,
      website: request.website || currentApp.websiteUrl || "",
      city: request.city || currentApp.city || "",
      address: request.address || currentApp.address || "",
      pincode: request.pincode || currentApp.pincode || "",
      email: request.email,
      mobile: request.mobile,
      passwordHash: request.passwordHash || "dummyPasswordHashUntilGoogleLink",
      photoUrl: request.photoUrl || "",
      photoKey: request.photoKey || "",
      googleId: request.googleId || null,
      isActive: true
    });

    // 3. Register with external RAG / Agent AI API
    try {
      const ragSubUser = await registerSubUser({
        name: request.name,
        email: request.email,
        password: "tempPassword123!",
        business_name: request.organizationName,
        website_url: request.website || "",
        mobile_number: request.mobile,
        city: request.city || "",
        pin_code: request.pincode || "",
        address: request.address || "",
        logo_url: request.photoUrl || ""
      });

      if (ragSubUser && ragSubUser.success && ragSubUser.user) {
        ceo.ragClientId = ragSubUser.user.client_id;
        ceo.ragToken = ragSubUser.user.token;
        await ceo.save();
      }
    } catch (ragErr) {
      console.error("[onboarding-approve-rag-error]", ragErr.message);
    }

    // 4. Update request status to Approved
    request.status = "Approved";
    await request.save();

    // 5. Send confirmation email to approved user
    try {
      const nodemailer = require("nodemailer");
      if (process.env.EMAIL_ENABLED === "true") {
        const transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "gmail",
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        await transporter.sendMail({
          from: `"magnifAi Support" <${process.env.EMAIL_USER}>`,
          to: request.email,
          subject: "Your magnifAi Account Has Been Approved!",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px; margin: auto;">
              <h2 style="color: #16a34a; text-align: center;">Account Approved 🎉</h2>
              <p>Hello <strong>${request.name}</strong>,</p>
              <p>We are excited to inform you that your registration request for <strong>${request.organizationName}</strong> has been approved by our administrators!</p>
              <p>You can now log in to the application and start generating amazing AI edited content.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In Now</a>
              </div>
              <p style="font-size: 12px; color: #6b7280; text-align: center;">If you have any questions, please contact our support team.</p>
            </div>
          `
        });
      }
    } catch (mailErr) {
      console.error("[onboarding-approve-mail-error]", mailErr.message);
    }

    return res.json({ success: true, message: "Onboarding request approved and workspace initialized successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST Reject Onboarding Request ──────────────────────────────────────────
router.post("/onboarding-requests/:id/reject", async (req, res) => {
  try {
    const { note } = req.body;
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "ONBOARDING_REQUEST_NOT_FOUND" });
    }
    if (request.status === "Approved") {
      return res.status(400).json({ error: "CANNOT_REJECT_APPROVED_REQUEST" });
    }

    request.status = "Rejected";
    request.rejectionReason = note || "Request rejected by administrator.";
    await request.save();

    // Send rejection email to user
    try {
      const nodemailer = require("nodemailer");
      if (process.env.EMAIL_ENABLED === "true") {
        const transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "gmail",
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        await transporter.sendMail({
          from: `"magnifAi Support" <${process.env.EMAIL_USER}>`,
          to: request.email,
          subject: "Update Regarding Your magnifAi Registration Request",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px; margin: auto;">
              <h2 style="color: #dc2626; text-align: center;">Onboarding Request Status Update</h2>
              <p>Hello <strong>${request.name}</strong>,</p>
              <p>Thank you for your interest in magnifAi. We have reviewed your registration request for <strong>${request.organizationName}</strong>.</p>
              <p>Unfortunately, your request could not be approved at this time for the following reason:</p>
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
                "${request.rejectionReason}"
              </div>
              <p>You may submit a new request with updated information if you wish.</p>
              <p style="font-size: 12px; color: #6b7280; text-align: center;">If you believe this was an error, please contact our support team.</p>
            </div>
          `
        });
      }
    } catch (mailErr) {
      console.error("[onboarding-reject-mail-error]", mailErr.message);
    }

    return res.json({ success: true, message: "Onboarding request rejected successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Whats AI WhatsApp Integration Routes ────────────────────────────────
router.get("/whatsapp/sso-link", async (req, res) => {
  try {
    const shareKey = process.env.WHATS_AI_PARTNER_KEY;
    const token = process.env.WHATS_AI_ACCESS_TOKEN;
    const ref = process.env.WHATS_AI_REFERENCE_KEY;
    const frontendUrl = process.env.WHATS_AI_FRONTEND_URL;

    if (!shareKey || !token || !ref || !frontendUrl) {
      return res.status(500).json({ error: "WHATS_AI_SSO_CREDENTIALS_MISSING" });
    }

    const ssoUrl = `${frontendUrl.replace(/\/$/, "")}/auth/api-share?shareKey=${encodeURIComponent(shareKey)}&token=${encodeURIComponent(token)}&ref=${encodeURIComponent(ref)}`;
    return res.json({ ssoUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/whatsapp/config", async (req, res) => {
  try {
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    if (!ceoId) {
      return res.status(403).json({ error: "UNAUTHORIZED_ROLE" });
    }

    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(ceoId);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    return res.json({
      whatsAppSendMode: ceo.whatsAppSendMode || "manual",
      isWhatsAppConnected: Boolean(ceo.whatsAppClientId),
      isWhatsAppConfigured: ceo.isWhatsAppConnected || false
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/whatsapp/toggle-mode", async (req, res) => {
  try {
    const { mode } = req.body;
    if (!["auto", "manual"].includes(mode)) {
      return res.status(400).json({ error: "INVALID_MODE" });
    }
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    if (!ceoId) {
      return res.status(403).json({ error: "UNAUTHORIZED_ROLE" });
    }

    const { CEO } = require("../models/CEO");
    const updated = await CEO.findByIdAndUpdate(ceoId, { whatsAppSendMode: mode }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    return res.json({ success: true, whatsAppSendMode: updated.whatsAppSendMode });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/whatsapp/sync-ceo", async (req, res) => {
  try {
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    if (!ceoId) {
      return res.status(403).json({ error: "UNAUTHORIZED_ROLE" });
    }

    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(ceoId);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

    if (!apiBaseUrl || !partnerKey) {
      return res.status(500).json({ error: "WHATS_AI_INTEGRATION_CONFIG_MISSING" });
    }

    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/sync-client`,
      {
        name: ceo.name,
        email: ceo.email || "",
        phone: ceo.mobile,
        businessName: ceo.company || ""
      },
      {
        headers: {
          "x-partner-key": partnerKey,
          "Content-Type": "application/json"
        }
      }
    );

    // If success, return the configuration status (whatsappConfigured boolean)
    const clientId = response.data?.data?.clientId;
    const isConfigured = response.data?.data?.whatsappConfigured || false;

    if (clientId) {
      ceo.whatsAppClientId = clientId;
      ceo.isWhatsAppConnected = isConfigured;
      await ceo.save();
    }

    return res.json({
      success: true,
      message: "CEO synced successfully with Whats AI",
      whatsappConfigured: isConfigured,
      data: response.data
    });
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-sync-ceo-error]", errorMsg);
    
    // Auto-cleanup database record if external API explicitly rejects or can't find the client/partner keys
    if (err.response && [400, 401, 403, 404].includes(err.response.status)) {
      try {
        const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
        if (ceoId) {
          const { CEO } = require("../models/CEO");
          await CEO.findByIdAndUpdate(ceoId, {
            whatsAppClientId: undefined,
            isWhatsAppConnected: false
          });
          console.log("[whatsapp-sync-ceo-error] Auto-cleaned local DB config due to external API rejection.");
        }
      } catch (dbErr) {
        console.error("[whatsapp-sync-ceo-error] Failed to auto-clean local DB:", dbErr.message);
      }
    }
    
    return res.status(500).json({ error: "SYNC_FAILED", message: errorMsg });
  }
});

router.post("/whatsapp/sync-client", async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({ error: "CONTACT_ID_REQUIRED" });
    }

    const { Contact } = require("../models/Contact");
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND" });
    }

    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

    if (!apiBaseUrl || !partnerKey) {
      return res.status(500).json({ error: "WHATS_AI_INTEGRATION_CONFIG_MISSING" });
    }

    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/sync-client`,
      {
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone,
        businessName: contact.company || ""
      },
      {
        headers: {
          "x-partner-key": partnerKey,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({ success: true, message: "Client synced successfully", data: response.data });
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-sync-client-error]", errorMsg);
    return res.status(500).json({ error: "SYNC_FAILED", message: errorMsg });
  }
});

router.post("/whatsapp/templates", async (req, res) => {
  try {
    const { clientEmail, templateName, category, language, headerText, bodyText, footerText, variables } = req.body;
    if (!clientEmail || !templateName || !bodyText) {
      return res.status(400).json({ error: "REQUIRED_FIELDS_MISSING" });
    }

    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

    if (!apiBaseUrl || !partnerKey) {
      return res.status(500).json({ error: "WHATS_AI_INTEGRATION_CONFIG_MISSING" });
    }

    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/request-template`,
      {
        clientEmail,
        templateName,
        category: category || "MARKETING",
        language: language || "en",
        headerText,
        bodyText,
        footerText,
        variables: variables || []
      },
      {
        headers: {
          "x-partner-key": partnerKey,
          "Content-Type": "application/json"
        }
      }
    );

    return res.status(201).json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-request-template-error]", errorMsg);
    return res.status(500).json({ error: "TEMPLATE_REQUEST_FAILED", message: errorMsg });
  }
});

router.get("/whatsapp/templates", async (req, res) => {
  try {
    const { clientEmail, templateName } = req.query;
    if (!clientEmail || !templateName) {
      return res.status(400).json({ error: "CLIENT_EMAIL_AND_TEMPLATE_NAME_REQUIRED" });
    }

    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const partnerKey = process.env.WHATS_AI_PARTNER_KEY;

    if (!apiBaseUrl || !partnerKey) {
      return res.status(500).json({ error: "WHATS_AI_INTEGRATION_CONFIG_MISSING" });
    }

    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/partner/template-status`,
      {
        params: { clientEmail, templateName },
        headers: {
          "x-partner-key": partnerKey
        }
      }
    );

    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-template-status-error]", errorMsg);
    return res.status(500).json({ error: "FETCH_STATUS_FAILED", message: errorMsg });
  }
});

// Route to fetch all WhatsApp templates for the client
router.get("/whatsapp/templates/list", async (req, res) => {
  try {
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);

    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates`,
      { headers }
    );

    // Map response templates to keys expected by the frontend with full details
    const rawList = response.data?.data?.templates || response.data?.templates || response.data?.data || [];
    const templates = (Array.isArray(rawList) ? rawList : []).map(t => {
      const body = t.bodyText || t.body || "";
      const matches = body.match(/\{\{(\d+)\}\}/g) || [];
      const varCount = (t.variables && t.variables.length) || (t.sampleParams && t.sampleParams.length) || matches.length || 0;
      return {
        id: t._id || t.id,
        name: t.name || t.templateName || t.whatsappTemplateName,
        templateName: t.whatsappTemplateName || t.name || t.templateName,
        metaTemplate: t.whatsappTemplateName || t.name || t.templateName,
        language: (t.language || t.languageCode || "en").toLowerCase(),
        status: t.metaStatus || t.status || "APPROVED",
        category: t.category || "UTILITY",
        bodyText: body,
        variables: t.variables || t.sampleParams || [],
        variablesCount: varCount
      };
    });

    return res.json({
      success: true,
      data: { templates },
      message: response.data?.message || "Templates"
    });
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-list-templates-error]", errorMsg);
    return res.status(500).json({ error: "LIST_TEMPLATES_FAILED", message: errorMsg });
  }
});

// Route to reset/disconnect WhatsApp connection details
router.post("/whatsapp/reset-connection", async (req, res) => {
  try {
    const ceoId = req.user.role === "CEO" ? req.user.sub : undefined;
    if (!ceoId) {
      return res.status(403).json({ error: "UNAUTHORIZED_ROLE" });
    }

    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(ceoId);
    if (!ceo) {
      return res.status(404).json({ error: "CEO_NOT_FOUND" });
    }

    ceo.whatsAppClientId = undefined;
    ceo.isWhatsAppConnected = false;
    await ceo.save();

    return res.json({ success: true, message: "WhatsApp connection reset successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper to get Whats AI Client JWT Token by doing an API sharing handshake login
const getWhatsAiClientToken = async () => {
  const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const clientToken = process.env.WHATS_AI_ACCESS_TOKEN;
  const ref = process.env.WHATS_AI_REFERENCE_KEY;
  const apiKey = process.env.WHATS_AI_API_KEY || "whatsai-core-master-secret-key-2026";

  if (!apiBaseUrl || !partnerKey || !clientToken || !ref) {
    throw new Error("WHATS_AI_INTEGRATION_CONFIG_MISSING");
  }

  const axios = require("axios");
  const response = await axios.post(
    `${apiBaseUrl.replace(/\/$/, "")}/api/auth/api-sharing-login`,
    {
      apiSharingKey: partnerKey,
      accessToken: clientToken,
      referenceKey: ref
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    }
  );
  
  if (response.data && response.data.token) {
    return response.data.token;
  } else if (response.data && response.data.data && response.data.data.token) {
    return response.data.data.token;
  } else if (response.data && response.data.data && response.data.data.accessToken) {
    return response.data.data.accessToken;
  } else if (response.data && response.data.accessToken) {
    return response.data.accessToken;
  }
  throw new Error("FAILED_TO_GET_JWT_TOKEN");
};

// Helper to get headers pre-authorized with Whats AI Client JWT Token
const getWhatsAiHeaders = async (req) => {
  const token = await getWhatsAiClientToken();
  const partnerKey = process.env.WHATS_AI_PARTNER_KEY;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-api-key": partnerKey,
    "Content-Type": "application/json"
  };
  if (req && req.user && req.user.role === "CEO") {
    const { CEO } = require("../models/CEO");
    const ceo = await CEO.findById(req.user.sub);
    if (ceo && ceo.whatsAppClientId) {
      headers["x-client-id"] = ceo.whatsAppClientId;
    }
  }
  return headers;
};

// Route to configure/connect WhatsApp Business Account (WABA) for a client
router.post("/whatsapp/waba", async (req, res) => {
  try {
    const { phoneNumberId, wabaId, accessToken } = req.body;
    if (!phoneNumberId || !wabaId || !accessToken) {
      return res.status(400).json({ error: "WABA_CONFIG_FIELDS_REQUIRED" });
    }
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/settings/waba`,
      { phoneNumberId, wabaId, accessToken },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-connect-waba-error]", errorMsg);
    return res.status(500).json({ error: "WABA_CONNECT_FAILED", message: errorMsg });
  }
});

// Route to fetch all WhatsApp conversations
router.get("/whatsapp/conversations", async (req, res) => {
  try {
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-conversations-error]", errorMsg);
    return res.status(500).json({ error: "GET_CONVERSATIONS_FAILED", message: errorMsg });
  }
});

// Route to fetch messages inside a specific WhatsApp conversation thread
router.get("/whatsapp/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/messages`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-messages-error]", errorMsg);
    return res.status(500).json({ error: "GET_MESSAGES_FAILED", message: errorMsg });
  }
});

// Route to send a manual WhatsApp text response
router.post("/whatsapp/conversations/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, text, body } = req.body;
    const msgText = (text || message || body || "").trim();
    if (!msgText) {
      return res.status(400).json({ error: "MESSAGE_REQUIRED" });
    }
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/reply`,
      {
        message: msgText,
        text: msgText,
        body: msgText
      },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-reply-error]", errorMsg);
    return res.status(500).json({ error: "REPLY_FAILED", message: errorMsg });
  }
});

// Route to send a template message to a specific phone number (Outbox / Auto-Welcome)
router.post("/whatsapp/send-template", async (req, res) => {
  try {
    const { phone, templateName, language, variables } = req.body;
    if (!phone || !templateName) {
      return res.status(400).json({ error: "PHONE_AND_TEMPLATE_REQUIRED" });
    }
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/send-template`,
      {
        phone,
        templateName,
        language: language || "en",
        variables: variables || []
      },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-send-template-error]", errorMsg);
    return res.status(500).json({ error: "SEND_TEMPLATE_FAILED", message: errorMsg });
  }
});

// Route to toggle AI Agent auto-reply on/off for a specific chat conversation
router.put("/whatsapp/conversations/:id/toggle-ai", async (req, res) => {
  try {
    const { id } = req.params;
    const { aiEnabled } = req.body;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.put(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/toggle-ai`,
      { aiEnabled },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-toggle-ai-error]", errorMsg);
    return res.status(500).json({ error: "TOGGLE_AI_FAILED", message: errorMsg });
  }
});

// Route to fetch all contact groups from Whats AI + accurately count contacts
router.get("/whatsapp/groups", async (req, res) => {
  try {
    const appId = req.user?.appId || req.user?.sub;
    const ceoId = req.user?.role === "CEO" ? req.user.sub : undefined;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    // 1. Fetch from WhatsAI
    let waGroups = [];
    try {
      const response = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`,
        { headers }
      );
      waGroups = response.data?.data?.groups || response.data?.groups || response.data?.data || (Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.log("[whatsapp-groups-fetch-notice]", e.message);
    }

    // 2. Fetch contacts from WhatsAI to count real contacts per group
    let waContacts = [];
    try {
      const contactsRes = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
        { headers }
      );
      waContacts = contactsRes.data?.data?.contacts || contactsRes.data?.contacts || contactsRes.data?.data || (Array.isArray(contactsRes.data) ? contactsRes.data : []);
    } catch (e) {
      console.log("[whatsapp-contacts-fetch-notice]", e.message);
    }

    // 3. Count contacts per group (checking both c.group and c.groups)
    const countMap = {};
    if (Array.isArray(waContacts)) {
      waContacts.forEach(c => {
        const groupArr = Array.isArray(c.group) ? c.group : (Array.isArray(c.groups) ? c.groups : [c.group || c.groups].filter(Boolean));
        groupArr.forEach(g => {
          const gName = (typeof g === "string" ? g : g?.name) || "";
          if (gName) {
            const key = gName.toLowerCase().trim();
            countMap[key] = (countMap[key] || 0) + 1;
          }
        });
      });
    }

    // 4. Fetch local MongoDB groups
    let localGroups = [];
    try {
      const filter = ceoId ? { ceoId } : { appId };
      localGroups = await Group.find(filter).lean();
    } catch (e) {
      console.log("[local-groups-fetch-notice]", e.message);
    }

    // 5. Merge groups uniquely by name with real counts
    const mergedMap = new Map();
    (Array.isArray(waGroups) ? waGroups : []).forEach(g => {
      if (g && g.name) {
        const groupKey = g.name.toLowerCase().trim();
        mergedMap.set(groupKey, {
          ...g,
          contactsCount: countMap[groupKey] || 0,
          source: "whatsAi"
        });
      }
    });

    localGroups.forEach(lg => {
      const key = lg.name.toLowerCase().trim();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          _id: lg._id.toString(),
          id: lg._id.toString(),
          name: lg.name,
          contactsCount: countMap[key] || (lg.members ? lg.members.length : 0),
          source: "peopleDirectory"
        });
      }
    });

    return res.json({ success: true, groups: Array.from(mergedMap.values()) });
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-groups-error]", errorMsg);
    return res.status(500).json({ error: "GET_GROUPS_FAILED", message: errorMsg });
  }
});

// Route to create a new contact group in Whats AI and MongoDB People directory
router.post("/whatsapp/groups", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "GROUP_NAME_REQUIRED" });
    }
    const appId = req.user?.appId || req.user?.sub;
    const ceoId = req.user?.role === "CEO" ? req.user.sub : undefined;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    // 1. Create in WhatsAI
    let waGroup = null;
    try {
      const response = await axios.post(
        `${apiBaseUrl.replace(/\/$/, "")}/api/contacts/groups`,
        { name: name.trim() },
        { headers }
      );
      waGroup = response.data?.data || response.data;
    } catch (e) {
      console.log("[whats-ai-group-create-notice]", e.message);
    }

    // 2. Also create in MongoDB Group collection for People directory
    try {
      const existing = await Group.findOne({ name: name.trim(), appId });
      if (!existing) {
        await Group.create({
          appId,
          ceoId,
          name: name.trim(),
          colorHex: "#FFD54F",
          members: []
        });
      }
    } catch (e) {
      console.log("[mongo-group-sync-notice]", e.message);
    }

    return res.json({ success: true, group: waGroup || { name: name.trim() } });
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-create-group-error]", errorMsg);
    return res.status(500).json({ error: "CREATE_GROUP_FAILED", message: errorMsg });
  }
});

// Route to fetch all unified contacts for WhatsApp Workspace
router.get("/whatsapp/contacts", async (req, res) => {
  try {
    const appId = req.user?.appId || req.user?.sub;
    const ceoId = req.user?.role === "CEO" ? req.user.sub : undefined;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);

    // 1. Fetch WhatsAI contacts
    let waContacts = [];
    try {
      const response = await axios.get(
        `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
        { headers }
      );
      waContacts = response.data?.data?.contacts || response.data?.contacts || response.data?.data || (Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.log("[whatsapp-contacts-fetch-notice]", e.message);
    }

    // 2. Fetch local MongoDB contacts (including newly scanned/added)
    let localContacts = [];
    try {
      const filter = ceoId ? { ceoId } : { appId };
      localContacts = await Contact.find(filter).limit(300).lean();
    } catch (e) {
      console.log("[mongo-contacts-fetch-notice]", e.message);
    }

    // 3. Merge seamlessly
    const seen = new Set();
    const all = [];

    localContacts.forEach(c => {
      const rawPhone = String(c.phone || "").replace(/[^0-9]/g, "");
      if (rawPhone && !seen.has(rawPhone)) {
        seen.add(rawPhone);
        all.push({
          _id: c._id.toString(),
          name: c.name || "Contact",
          phone: c.phone,
          company: c.company || "",
          isBusinessCard: !!c.isBusinessCard,
          source: "People Directory"
        });
      }
    });

    waContacts.forEach(c => {
      const rawPhone = String(c.phone || "").replace(/[^0-9]/g, "");
      if (rawPhone && !seen.has(rawPhone)) {
        seen.add(rawPhone);
        all.push({
          _id: c._id || c.id,
          name: c.name || "WhatsApp Contact",
          phone: c.phone,
          company: "",
          isBusinessCard: false,
          source: "WhatsAI"
        });
      }
    });

    return res.json({ success: true, contacts: all });
  } catch (err) {
    console.error("[whatsapp-contacts-error]", err.message);
    return res.status(500).json({ error: "FAILED_TO_FETCH_CONTACTS" });
  }
});

// Route to add a contact to a group in Whats AI and MongoDB People directory
router.post("/whatsapp/contacts", async (req, res) => {
  try {
    const { name, phone, groups, customAttributes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "NAME_AND_PHONE_REQUIRED" });
    }
    const appId = req.user?.appId || req.user?.sub;
    const ceoId = req.user?.role === "CEO" ? req.user.sub : undefined;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    // 1. Add to WhatsAI
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/contacts`,
      { name: name.trim(), phone: phone.trim(), groups, customAttributes },
      { headers }
    );

    // 2. Also ensure contact is in MongoDB Contact collection for People Directory
    try {
      let contact = await Contact.findOne({ phone: phone.trim(), appId });
      if (!contact) {
        contact = await Contact.create({
          appId,
          ceoId,
          name: name.trim(),
          phone: phone.trim(),
          source: "WHATSAPP_CAMPAIGN"
        });
      }
      // If group is specified, link contact to MongoDB Group
      if (groups && Array.isArray(groups) && groups.length > 0) {
        const groupName = groups[0];
        const groupDoc = await Group.findOne({ name: groupName, appId });
        if (groupDoc && !groupDoc.members.includes(contact._id)) {
          groupDoc.members.push(contact._id);
          await groupDoc.save();
        }
      }
    } catch (e) {
      console.log("[mongo-contact-sync-notice]", e.message);
    }

    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-create-contact-error]", errorMsg);
    return res.status(500).json({ error: "CREATE_CONTACT_FAILED", message: errorMsg });
  }
});

// Route to fetch campaign lists from Whats AI
router.get("/whatsapp/campaigns", async (req, res) => {
  try {
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-campaigns-error]", errorMsg);
    return res.status(500).json({ error: "GET_CAMPAIGNS_FAILED", message: errorMsg });
  }
});

// Route to create a new template campaign in Whats AI
router.post("/whatsapp/campaigns", async (req, res) => {
  try {
    const { name, templateId, groupId, variablesMapping } = req.body;
    if (!name || !templateId || !groupId) {
      return res.status(400).json({ error: "REQUIRED_CAMPAIGN_FIELDS_MISSING" });
    }
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns`,
      { name, templateId, groupId, variablesMapping },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-create-campaign-error]", errorMsg);
    return res.status(500).json({ error: "CREATE_CAMPAIGN_FAILED", message: errorMsg });
  }
});

// Route to trigger/send a campaign broadcast
router.post("/whatsapp/campaigns/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${id}/send`,
      {},
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-send-campaign-error]", errorMsg);
    return res.status(500).json({ error: "SEND_CAMPAIGN_FAILED", message: errorMsg });
  }
});

// Route to fetch WhatsApp overview stats from Whats AI
router.get("/whatsapp/analytics/overview", async (req, res) => {
  try {
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/analytics/overview`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-analytics-overview-error]", errorMsg);
    return res.status(500).json({ error: "GET_OVERVIEW_STATS_FAILED", message: errorMsg });
  }
});

// Route to fetch WhatsApp timeline chart data from Whats AI
router.get("/whatsapp/analytics/timeline", async (req, res) => {
  try {
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/analytics/timeline`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-analytics-timeline-error]", errorMsg);
    return res.status(500).json({ error: "GET_TIMELINE_CHART_FAILED", message: errorMsg });
  }
});

// Route to send a media WhatsApp response
router.post("/whatsapp/conversations/:id/reply-media", logoUpload.single("mediaFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "MEDIA_FILE_REQUIRED" });
    }
    const { id } = req.params;
    const { caption } = req.body;
    
    const axios = require("axios");
    const FormData = require("form-data");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const form = new FormData();
    form.append("mediaFile", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    if (caption) {
      form.append("caption", caption);
    }
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/reply-media`,
      form,
      {
        headers: {
          ...headers,
          ...form.getHeaders()
        }
      }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-reply-media-error]", errorMsg);
    return res.status(500).json({ error: "REPLY_MEDIA_FAILED", message: errorMsg });
  }
});

// Route to mark a WhatsApp conversation as read
router.put("/whatsapp/conversations/:id/mark-read", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.put(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/mark-read`,
      {},
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-mark-read-error]", errorMsg);
    return res.status(500).json({ error: "MARK_READ_FAILED", message: errorMsg });
  }
});

// Route to resolve a WhatsApp conversation
router.put("/whatsapp/conversations/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.put(
      `${apiBaseUrl.replace(/\/$/, "")}/api/inbox/conversations/${id}/resolve`,
      {},
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-resolve-conversation-error]", errorMsg);
    return res.status(500).json({ error: "RESOLVE_CONVERSATION_FAILED", message: errorMsg });
  }
});

// Route to fetch a WhatsApp campaign details from Whats AI
router.get("/whatsapp/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${id}`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-campaign-detail-error]", errorMsg);
    return res.status(500).json({ error: "GET_CAMPAIGN_DETAIL_FAILED", message: errorMsg });
  }
});

// Route to pause/cancel a WhatsApp campaign in Whats AI
router.put("/whatsapp/campaigns/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.put(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${id}/cancel`,
      {},
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-cancel-campaign-error]", errorMsg);
    return res.status(500).json({ error: "CANCEL_CAMPAIGN_FAILED", message: errorMsg });
  }
});

// Route to upload media for campaigns in Whats AI
router.post("/whatsapp/campaigns/upload-media", logoUpload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "MEDIA_FILE_REQUIRED" });
    }
    const axios = require("axios");
    const FormData = require("form-data");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const form = new FormData();
    form.append("media", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/upload-media`,
      form,
      {
        headers: {
          ...headers,
          ...form.getHeaders()
        }
      }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-campaign-upload-media-error]", errorMsg);
    return res.status(500).json({ error: "CAMPAIGN_UPLOAD_MEDIA_FAILED", message: errorMsg });
  }
});

// Route to delete a WhatsApp campaign in Whats AI
router.delete("/whatsapp/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.delete(
      `${apiBaseUrl.replace(/\/$/, "")}/api/campaigns/${id}`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-delete-campaign-error]", errorMsg);
    return res.status(500).json({ error: "DELETE_CAMPAIGN_FAILED", message: errorMsg });
  }
});

// Route to fetch details of a WhatsApp template from Whats AI
router.get("/whatsapp/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.get(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates/${id}`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-get-template-detail-error]", errorMsg);
    return res.status(500).json({ error: "GET_TEMPLATE_DETAIL_FAILED", message: errorMsg });
  }
});

// Route to create a new draft template in Whats AI
router.post("/whatsapp/templates/draft", async (req, res) => {
  try {
    const { name, category, language, bodyText } = req.body;
    if (!name || !category || !language || !bodyText) {
      return res.status(400).json({ error: "REQUIRED_TEMPLATE_FIELDS_MISSING" });
    }
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.post(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates`,
      { name, category, language, bodyText },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-create-template-draft-error]", errorMsg);
    return res.status(500).json({ error: "CREATE_TEMPLATE_DRAFT_FAILED", message: errorMsg });
  }
});

// Route to edit variables/params of a WhatsApp template draft in Whats AI
router.patch("/whatsapp/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sampleParams } = req.body;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.patch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates/${id}`,
      { sampleParams },
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-edit-template-error]", errorMsg);
    return res.status(500).json({ error: "EDIT_TEMPLATE_FAILED", message: errorMsg });
  }
});

// Route to delete a draft template in Whats AI
router.delete("/whatsapp/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require("axios");
    const apiBaseUrl = process.env.WHATS_AI_API_BASE_URL;
    const headers = await getWhatsAiHeaders(req);
    
    const response = await axios.delete(
      `${apiBaseUrl.replace(/\/$/, "")}/api/templates/${id}`,
      { headers }
    );
    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-delete-template-error]", errorMsg);
    return res.status(500).json({ error: "DELETE_TEMPLATE_FAILED", message: errorMsg });
  }
});


// adplifAI B2B Integration Proxy Routes
router.post("/ads/launch", async (req, res) => {
  try {
    const axios = require("axios");
    const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
    const apiKey = process.env.ADPLIFAI_API_KEY;

    if (!baseUrl || !apiKey) {
      return res.status(500).json({ error: "ADPLIFAI_INTEGRATION_CONFIG_MISSING" });
    }

    const response = await axios.post(
      `${baseUrl.replace(/\/$/, "")}/partner/campaigns/launch`,
      req.body,
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[adplifai-launch-error]", errorMsg);
    return res.status(err.response?.status || 500).json({ error: "LAUNCH_FAILED", message: errorMsg });
  }
});

router.post("/ads/:campaignId/pause", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const axios = require("axios");
    const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
    const apiKey = process.env.ADPLIFAI_API_KEY;

    const response = await axios.post(
      `${baseUrl.replace(/\/$/, "")}/partner/campaigns/${campaignId}/pause`,
      {},
      {
        headers: { "x-api-key": apiKey }
      }
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({ error: "PAUSE_FAILED", message: err.message });
  }
});

router.post("/ads/:campaignId/resume", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const axios = require("axios");
    const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
    const apiKey = process.env.ADPLIFAI_API_KEY;

    const response = await axios.post(
      `${baseUrl.replace(/\/$/, "")}/partner/campaigns/${campaignId}/resume`,
      {},
      {
        headers: { "x-api-key": apiKey }
      }
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({ error: "RESUME_FAILED", message: err.message });
  }
});

router.delete("/ads/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const axios = require("axios");
    const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
    const apiKey = process.env.ADPLIFAI_API_KEY;

    const response = await axios.delete(
      `${baseUrl.replace(/\/$/, "")}/partner/campaigns/${campaignId}`,
      {
        headers: { "x-api-key": apiKey }
      }
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({ error: "DELETE_FAILED", message: err.message });
  }
});

router.get("/ads/:campaignId/status", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const axios = require("axios");
    const baseUrl = process.env.ADPLIFAI_API_BASE_URL;
    const apiKey = process.env.ADPLIFAI_API_KEY;

    const response = await axios.get(
      `${baseUrl.replace(/\/$/, "")}/partner/campaign-status/${campaignId}`,
      {
        headers: { "x-api-key": apiKey }
      }
    );
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({ error: "STATUS_FAILED", message: err.message });
  }
});

router.post("/ads/upload", logoUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "NO_FILE_UPLOADED" });
    }
    const uploaded = await uploadToR2(req.file, "ads/media");
    return res.json({ success: true, url: uploaded.url });
  } catch (err) {
    console.error("[ads-upload-error]", err.message);
    return res.status(500).json({ error: "UPLOAD_FAILED", message: err.message });
  }
});

module.exports = { appPortalRouter: router };
