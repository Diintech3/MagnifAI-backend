const fs = require("fs");
const path = require("path");
const { ConstituencyResult } = require("../models/ConstituencyResult");
const { loadUpBoundaries, estimatePolledVotes } = require("./boundaryService");

const PARTY_COLORS = {
  BJP: "#ff8a1a",
  SP: "#a9b247",
  INC: "#4ea8de",
  BSP: "#9aa5b1",
  RLD: "#8db46a",
  AAP: "#2fa84f",
  SBSP: "#e91e63",
  ADS: "#f4b400",
  NISHAD: "#c0392b",
  IND: "#95a5a6",
  CPI: "#e74c3c",
  CPM: "#c0392b",
  Others: "#cfd8e3",
};

function partyColor(party) {
  return PARTY_COLORS[String(party || "Others").toUpperCase()] || PARTY_COLORS.Others;
}

function getYearResult(doc, year) {
  const y = String(year);
  return doc.results?.[y] || null;
}

function buildQuery(stateCode, filters) {
  const { search, year, party2012, party2017, party2022, party } = filters;
  const q = { stateCode: String(stateCode).toUpperCase() };
  const and = [];

  if (search?.trim()) {
    const needle = search.trim();
    const num = parseInt(needle, 10);
    if (Number.isFinite(num)) {
      and.push({ $or: [{ acNo: num }, { acName: new RegExp(needle, "i") }, { district: new RegExp(needle, "i") }] });
    } else {
      and.push({
        $or: [
          { acName: new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { district: new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { "results.2022.candidate": new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ],
      });
    }
  }

  const y = String(year || "2022");
  if (party && party !== "ALL") {
    and.push({ [`results.${y}.party`]: party.toUpperCase() });
  }
  if (party2012 && party2012 !== "All selected") {
    and.push({ "results.2012.party": party2012.toUpperCase() });
  }
  if (party2017 && party2017 !== "All selected") {
    and.push({ "results.2017.party": party2017.toUpperCase() });
  }
  if (party2022 && party2022 !== "All selected") {
    and.push({ "results.2022.party": party2022.toUpperCase() });
  }

  if (and.length) q.$and = and;
  return q;
}

function aggregatePartyStats(docs, year) {
  const y = String(year || "2022");
  const counts = {};
  let totalVotes = 0;
  for (const doc of docs) {
    const r = getYearResult(doc, y);
    if (!r?.party) continue;
    const p = r.party;
    if (!counts[p]) counts[p] = { party: p, seats: 0, votes: 0, color: partyColor(p) };
    counts[p].seats += 1;
    counts[p].votes += r.votes || 0;
    totalVotes += r.votes || 0;
  }
  const parties = Object.values(counts).sort((a, b) => b.seats - a.seats || b.votes - a.votes);
  return parties.map((p) => ({
    ...p,
    voteShare: totalVotes ? Number(((p.votes / totalVotes) * 100).toFixed(2)) : 0,
  }));
}

function buildGeoJson(docs, year, allDocs) {
  const y = String(year || "2022");
  const boundaries = loadUpBoundaries();
  const resultByAc = new Map((allDocs || docs).map((d) => [d.acNo, d]));
  const visible = new Set(docs.map((d) => d.acNo));
  const isFiltered = docs.length !== (allDocs || docs).length;

  if (!boundaries?.features?.length) {
    return { type: "FeatureCollection", features: [] };
  }

  const features = boundaries.features
    .map((f) => {
      const acNo = Number(f.properties?.ac);
      if (!Number.isFinite(acNo)) return null;
      if (isFiltered && !visible.has(acNo)) return null;

      const d = resultByAc.get(acNo);
      const r = d ? getYearResult(d, y) : null;
      const party = r?.party || "Others";
      const votes = r?.votes || 0;
      const votePercent = r?.votePercent || 0;

      return {
        type: "Feature",
        geometry: f.geometry,
        properties: {
          acNo,
          acName: d?.acName || f.properties?.ac_name || "",
          constituency: d?.acName || f.properties?.ac_name || "",
          district: d?.district || "",
          pcName: f.properties?.pc_name || "",
          party,
          candidate: r?.candidate || "",
          votes,
          votePercent,
          polledVotes: estimatePolledVotes(votes, votePercent),
          runnerUpParty: r?.runnerUpParty || "",
          margin: r?.margin || 0,
          year: y,
          party2012: d?.results?.["2012"]?.party || null,
          party2017: d?.results?.["2017"]?.party || null,
          party2022: d?.results?.["2022"]?.party || null,
          fillColor: partyColor(party),
        },
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection", features };
}

function buildSunburstData(partyStats) {
  const top = partyStats.slice(0, 12);
  const rest = partyStats.slice(12);
  const children = top.map((p) => ({
    name: p.party,
    value: p.seats,
    color: p.color,
    votes: p.votes,
  }));
  if (rest.length) {
    children.push({
      name: "Others",
      value: rest.reduce((s, x) => s + x.seats, 0),
      color: PARTY_COLORS.Others,
      votes: rest.reduce((s, x) => s + x.votes, 0),
    });
  }
  return { name: "UP", children };
}

async function ensureUpSeed() {
  const count = await ConstituencyResult.countDocuments({ stateCode: "UP" });
  if (count > 0) return count;

  const filePath = path.join(__dirname, "../../data/up-assembly-results.json");
  if (!fs.existsSync(filePath)) return 0;

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const byAc = new Map();
  for (const row of raw) {
    const existing = byAc.get(row.acNo);
    if (!existing || (row.results?.["2022"]?.votes || 0) > (existing.results?.["2022"]?.votes || 0)) {
      byAc.set(row.acNo, row);
    }
  }
  const docs = [...byAc.values()]
    .filter((r) => r.acNo >= 1 && r.acNo <= 403)
    .map((row) => {
      const r2022 = row.results?.["2022"];
      if (r2022 && r2022.votes && r2022.runnerUpVotes) {
        r2022.margin = Math.max(0, r2022.votes - r2022.runnerUpVotes);
      }
      return row;
    });
  if (!docs.length) return 0;

  await ConstituencyResult.insertMany(docs, { ordered: false }).catch(() => {});
  return ConstituencyResult.countDocuments({ stateCode: "UP" });
}

async function getAnalytics(stateCode, filters = {}) {
  await ensureUpSeed();
  const code = String(stateCode).toUpperCase();
  if (code !== "UP") {
    return { supported: false, message: "Constituency analytics available for UP only." };
  }

  const year = String(filters.year || "2022");
  const query = buildQuery(code, filters);
  const docs = await ConstituencyResult.find(query).sort({ acNo: 1 }).lean();
  const allDocs = await ConstituencyResult.find({ stateCode: code }).lean();
  const partyStats = aggregatePartyStats(allDocs, year);
  const filteredPartyStats = aggregatePartyStats(docs, year);

  return {
    supported: true,
    stateCode: code,
    year,
    totalConstituencies: allDocs.length,
    matchCount: docs.length,
    partyStats,
    filteredPartyStats,
    sunburst: buildSunburstData(filteredPartyStats.length ? filteredPartyStats : partyStats),
    geoJson: buildGeoJson(docs, year, allDocs),
    mapBoundaries: Boolean(loadUpBoundaries()?.features?.length),
    constituencies: docs.map((d) => {
      const r = getYearResult(d, year);
      return {
        acNo: d.acNo,
        acName: d.acName,
        district: d.district,
        party: r?.party || "—",
        candidate: r?.candidate || "—",
        votes: r?.votes || 0,
        votePercent: r?.votePercent || 0,
        margin: r?.margin || 0,
        runnerUpParty: r?.runnerUpParty || "—",
        party2012: d.results?.["2012"]?.party || "—",
        party2017: d.results?.["2017"]?.party || "—",
        party2022: d.results?.["2022"]?.party || "—",
      };
    }),
    partyColors: PARTY_COLORS,
    source: "Wikipedia / ECI constituency results (2017, 2022)",
  };
}

module.exports = {
  ensureUpSeed,
  getAnalytics,
  partyColor,
  PARTY_COLORS,
};
