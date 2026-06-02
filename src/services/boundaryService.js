const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");

let boundariesCache = null;

function loadUpBoundaries() {
  if (boundariesCache) return boundariesCache;
  const filePath = path.join(__dirname, "../../data/up-assembly-topo.json");
  if (!fs.existsSync(filePath)) return null;
  const topo = JSON.parse(fs.readFileSync(filePath, "utf8"));
  boundariesCache = topojson.feature(topo, topo.objects.polygons);
  return boundariesCache;
}

function estimatePolledVotes(votes, votePercent) {
  if (!votes || !votePercent) return null;
  const pct = Number(votePercent);
  if (!pct) return null;
  return Math.round(votes / (pct / 100));
}

module.exports = { loadUpBoundaries, estimatePolledVotes };
