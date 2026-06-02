const fs = require("fs");
const path = require("path");
const { ELECTION_BODY_TYPES, getBodyType } = require("../data/electionBodyTypes");
const { getUpVidhanAnalytics } = require("./upVidhanDataService");

const DATA_DIR = path.join(__dirname, "../../data/election-bodies");
const cache = new Map();

function bodyFileName(stateCode, bodyType, year) {
  const code = String(stateCode).toLowerCase();
  const type = String(bodyType).toLowerCase().replace(/_/g, "-");
  return `${code}-${type}-${year}.json`;
}

function loadBodyJson(stateCode, bodyType, year) {
  const key = `${stateCode}:${bodyType}:${year}`;
  if (cache.has(key)) return cache.get(key);

  const filePath = path.join(DATA_DIR, bodyFileName(stateCode, bodyType, year));
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  cache.set(key, data);
  return data;
}

function filterSeats(seats, filters) {
  const { search, party } = filters;
  let out = seats || [];
  if (party && party !== "ALL") {
    out = out.filter((s) => String(s.party).toUpperCase() === party.toUpperCase());
  }
  if (search?.trim()) {
    const needle = search.trim().toLowerCase();
    const num = parseInt(needle, 10);
    out = out.filter((s) => {
      if (Number.isFinite(num) && s.seatNo === num) return true;
      return (
        String(s.seatName || "").toLowerCase().includes(needle) ||
        String(s.district || "").toLowerCase().includes(needle) ||
        String(s.candidate || "").toLowerCase().includes(needle)
      );
    });
  }
  return out;
}

function mapBodyPayload(meta, data, filters) {
  const seats = filterSeats(data.seats, filters);
  return {
    supported: true,
    stateCode: data.stateCode,
    stateName: "Uttar Pradesh",
    bodyType: data.bodyType,
    bodyLabel: meta.label,
    role: data.role || meta.role,
    year: data.year,
    totalSeats: data.totalSeats,
    matchCount: seats.length,
    totalConstituencies: data.seats?.length || 0,
    partyStats: data.partyStats || [],
    filteredPartyStats: data.partyStats || [],
    summary: data.summary || null,
    totalUrbanBodies: data.totalUrbanBodies || null,
    seats,
    constituencies: seats.map((s) => ({
      acNo: s.seatNo,
      acName: s.seatName,
      district: s.district || "—",
      party: s.party || "—",
      candidate: s.candidate || "—",
      votes: s.votes || 0,
      votePercent: s.votePercent || 0,
      margin: 0,
      runnerUpParty: "—",
      totalWards: s.totalWards,
      wardBreakdown: s.wardBreakdown,
      note: s.note,
    })),
    source: data.source,
    hasMap: meta.hasMap,
  };
}

async function getBodyAnalytics(stateCode, bodyTypeId, filters = {}) {
  const code = String(stateCode).toUpperCase();
  const meta = getBodyType(bodyTypeId);
  if (!meta) return { supported: false, message: "Unknown election body type" };

  const year = Number(filters.year) || meta.defaultYear;

  if (meta.id === "VIDHAN_SABHA" && code === "UP") {
    const vidhan = getUpVidhanAnalytics({ ...filters, year: String(year) });
    return {
      ...vidhan,
      stateName: "Uttar Pradesh",
      bodyType: meta.id,
      bodyLabel: meta.label,
      role: meta.role,
      hasMap: true,
    };
  }

  if (code !== "UP") {
    return {
      supported: false,
      message: `${meta.label} data is currently loaded for Uttar Pradesh only.`,
      bodyType: meta.id,
      bodyLabel: meta.label,
    };
  }

  const data = loadBodyJson("up", meta.id, year);
  if (!data) {
    return {
      supported: false,
      message: `${meta.label} (${year}) dataset not found. Run: node scripts/buildElectionBodies.js`,
      bodyType: meta.id,
      bodyLabel: meta.label,
    };
  }

  return mapBodyPayload(meta, data, filters);
}

function listElectionBodies() {
  return ELECTION_BODY_TYPES.map((b) => ({
    id: b.id,
    label: b.label,
    labelHi: b.labelHi,
    role: b.role,
    defaultYear: b.defaultYear,
    years: b.years,
    seatLabel: b.seatLabel,
    description: b.description,
    hasMap: b.hasMap,
  }));
}

module.exports = { getBodyAnalytics, listElectionBodies, loadBodyJson };
