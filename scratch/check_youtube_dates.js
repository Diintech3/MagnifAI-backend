const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { CEO } = require("../src/models/CEO");

async function checkYoutubeDates() {
  const dbUri = process.env.MONGODB_URI;
  await mongoose.connect(dbUri);

  const ceo = await CEO.findOne({ email: /vijay/i });
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = ceo.social.youtube.channelId;

  console.log("Channel ID:", channelId);

  const YT_BASE = "https://www.googleapis.com/youtube/v3";
  try {
    const channelRes = await axios.get(`${YT_BASE}/channels?part=statistics,snippet,contentDetails&id=${channelId}&key=${apiKey}`);
    const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
    console.log("Uploads Playlist ID:", uploadsPlaylistId);

    const playlistRes = await axios.get(`${YT_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
    console.log("Fetched playlist items count:", playlistRes.data.items.length);

    playlistRes.data.items.forEach((item, index) => {
      console.log(`Video ${index + 1}: Title: ${item.snippet.title} | PublishedAt: ${item.snippet.publishedAt}`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  }

  await mongoose.disconnect();
}

checkYoutubeDates();
