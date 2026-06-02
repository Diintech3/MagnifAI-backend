/**
 * Fast UP Vidhan Sabha analytics from local JSON (no MongoDB required for map).
 */
const fs = require("fs");
const path = require("path");
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

const MERGE_YEARS = ["2012", "2017", "2022"];

const DATA_DIR = path.join(__dirname, "../../data/election-bodies");
const seatCache = new Map();

function loadVidhanYear(year) {
  const y = String(year || "2022");
  if (seatCache.has(y)) return seatCache.get(y);
  const filePath = path.join(DATA_DIR, `up-vidhan-sabha-${y}.json`);
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  seatCache.set(y, data);
  return data;
}

function seatResultRow(seat) {
  return {
    party: seat.party,
    candidate: seat.candidate,
    votes: seat.votes || 0,
    votePercent: seat.votePercent || 0,
    runnerUpParty: seat.runnerUpParty || "",
    runnerUpVotes: seat.runnerUpVotes || 0,
    margin: seat.margin || 0,
  };
}

function buildMergedDocs() {
  const byAc = new Map();
  for (const y of MERGE_YEARS) {
    const data = loadVidhanYear(y);
    if (!data?.seats?.length) continue;
    for (const seat of data.seats) {
      const acNo = seat.seatNo;
      if (!byAc.has(acNo)) {
        byAc.set(acNo, {
          acNo,
          acName: seat.seatName,
          district: seat.district || "",
          results: {},
        });
      }
      const doc = byAc.get(acNo);
      if (seat.seatName) doc.acName = seat.seatName;
      if (seat.district) doc.district = seat.district;
      doc.results[y] = seatResultRow(seat);
    }
  }
  return Array.from(byAc.values()).sort((a, b) => a.acNo - b.acNo);
}

function filterDocs(docs, filters) {
  const { search, party, party2012, party2017, party2022 } = filters;
  const year = String(filters.year || "2022");
  let out = docs;

  if (party && party !== "ALL") {
    out = out.filter((d) => d.results?.[year]?.party === String(party).toUpperCase());
  }
  if (party2012 && party2012 !== "All selected") {
    out = out.filter((d) => d.results?.["2012"]?.party === String(party2012).toUpperCase());
  }
  if (party2017 && party2017 !== "All selected") {
    out = out.filter((d) => d.results?.["2017"]?.party === String(party2017).toUpperCase());
  }
  if (party2022 && party2022 !== "All selected") {
    out = out.filter((d) => d.results?.["2022"]?.party === String(party2022).toUpperCase());
  }

  if (search?.trim()) {
    const needle = search.trim().toLowerCase();
    const num = parseInt(needle, 10);
    out = out.filter((d) => {
      if (Number.isFinite(num) && d.acNo === num) return true;
      return (
        String(d.acName || "").toLowerCase().includes(needle) ||
        String(d.district || "").toLowerCase().includes(needle) ||
        String(d.results?.[year]?.candidate || "").toLowerCase().includes(needle)
      );
    });
  }
  return out;
}

function aggregatePartyStats(docs, year) {
  const y = String(year || "2022");
  const counts = {};
  let totalVotes = 0;
  for (const doc of docs) {
    const r = doc.results?.[y];
    if (!r?.party) continue;
    const p = r.party;
    if (!counts[p]) counts[p] = { party: p, seats: 0, votes: 0, color: partyColor(p) };
    counts[p].seats += 1;
    counts[p].votes += r.votes || 0;
    totalVotes += r.votes || 0;
  }
  return Object.values(counts)
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes)
    .map((p) => ({
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
      const r = d ? d.results?.[y] : null;
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

function getUpVidhanAnalytics(filters = {}) {
  const year = String(filters.year || "2022");
  const fileData = loadVidhanYear(year);
  if (!fileData?.seats?.length) {
    return {
      supported: false,
      message: `Vidhan Sabha ${year} data file missing. Run: node scripts/buildElectionBodies.js`,
    };
  }

  const allDocs = buildMergedDocs();
  if (!allDocs.length) {
    return {
      supported: false,
      message: `Vidhan Sabha ${year} data file missing. Run: node scripts/buildElectionBodies.js`,
    };
  }
  const docs = filterDocs(allDocs, { ...filters, year });
  const partyStats = aggregatePartyStats(allDocs, year);
  const filteredPartyStats = aggregatePartyStats(docs, year);

  return {
    supported: true,
    stateCode: "UP",
    stateName: "Uttar Pradesh",
    year,
    totalConstituencies: allDocs.length,
    matchCount: docs.length,
    partyStats,
    filteredPartyStats,
    sunburst: buildSunburstData(filteredPartyStats.length ? filteredPartyStats : partyStats),
    geoJson: buildGeoJson(docs, year, allDocs),
    mapBoundaries: Boolean(loadUpBoundaries()?.features?.length),
    constituencies: docs.map((d) => {
      const r = d.results?.[year];
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
    source: fileData.source || "ECI / data-analytics CSV (local file)",
    dataMode: "file",
  };
}

module.exports = { getUpVidhanAnalytics, loadVidhanYear };
