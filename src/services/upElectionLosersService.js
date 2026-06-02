/**
 * Defeated / lost election candidates — full detail from CSV (Vidhan Sabha) and runner-up (Lok Sabha).
 */
const fs = require("fs");
const path = require("path");
const { loadBodyJson } = require("./electionBodyService");

const CSV_PATH = path.join(__dirname, "../../data/Uttar_Pradesh.csv");
const BODY_DIR = path.join(__dirname, "../../data/election-bodies");
const PROFILE_DIR = path.join(__dirname, "../../data/candidate-profiles");

const PARTY_MAP = {
  BJP: "BJP",
  SP: "SP",
  BSP: "BSP",
  INC: "INC",
  RLD: "RLD",
  AAP: "AAP",
  IND: "IND",
  Others: "Others",
};

function normalizeParty(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (PARTY_MAP[s]) return PARTY_MAP[s];
  if (s.includes("BJP") || s.includes("BHARATIYA")) return "BJP";
  if (s.includes("SAMAJWADI")) return "SP";
  if (s.includes("BAHUJAN")) return "BSP";
  if (s.includes("CONGRESS")) return "INC";
  if (s.includes("INDEPENDENT") || s === "IND") return "IND";
  return "Others";
}

function parseNum(raw) {
  const n = parseInt(String(raw || "").replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const csvCache = new Map();
const profileCache = new Map();

function normNameKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function loadCandidateProfiles({ stateCode = "UP", bodyType, year }) {
  const code = String(stateCode || "UP").toUpperCase();
  const bt = String(bodyType || "VIDHAN_SABHA").toUpperCase();
  const y = String(year || "2022");
  const key = `${code}:${bt}:${y}`;
  if (profileCache.has(key)) return profileCache.get(key);

  const filePath = path.join(PROFILE_DIR, `${code.toLowerCase()}-${bt.toLowerCase().replace(/_/g, "-")}-${y}.json`);
  if (!fs.existsSync(filePath)) {
    const empty = { bySeat: {} };
    profileCache.set(key, empty);
    return empty;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const out = { bySeat: data.bySeat || {} };
    profileCache.set(key, out);
    return out;
  } catch {
    const empty = { bySeat: {} };
    profileCache.set(key, empty);
    return empty;
  }
}

function getProfileFor({ profiles, seatNo, candidate }) {
  if (!profiles?.bySeat) return null;
  const seatKey = String(seatNo);
  const nameKey = normNameKey(candidate);
  const seatBlock = profiles.bySeat[seatKey];
  if (!seatBlock) return null;

  // exact
  if (seatBlock[nameKey]) return seatBlock[nameKey];

  // fallback: try to match ignoring punctuation
  const simple = nameKey.replace(/[^a-z0-9 ]/g, "");
  for (const [k, v] of Object.entries(seatBlock)) {
    if (String(k).replace(/[^a-z0-9 ]/g, "") === simple) return v;
  }
  return null;
}

function loadCsvYear(year) {
  const y = String(year);
  if (csvCache.has(y)) return csvCache.get(y);

  if (!fs.existsSync(CSV_PATH)) return null;

  const lines = fs.readFileSync(CSV_PATH, "utf8").trim().split("\n").slice(1);
  const byAc = new Map();

  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length < 9) continue;
    const yearVal = parseInt(parts[6], 10);
    if (String(yearVal) !== y) continue;

    const acNo = parseInt(parts[2], 10);
    const acName = parts[1];
    const candidate = parts[3];
    const party = normalizeParty(parts[4]);
    const votes = parseNum(parts[5]);
    const polledVotes = parseNum(parts[7]);
    const votePercent = parseFloat(parts[8]) || 0;

    if (!byAc.has(acNo)) byAc.set(acNo, { acNo, acName, polledVotes, candidates: [] });
    const group = byAc.get(acNo);
    if (polledVotes) group.polledVotes = polledVotes;
    group.candidates.push({ candidate, party, votes, votePercent });
  }

  for (const group of byAc.values()) {
    group.candidates.sort((a, b) => b.votes - a.votes);
    group.winner = group.candidates[0] || null;
    group.losers = group.candidates.slice(1);
  }

  const districts = loadDistrictMap(y);
  const result = [...byAc.values()]
    .sort((a, b) => a.acNo - b.acNo)
    .map((g) => ({
      ...g,
      district: districts.get(g.acNo) || "",
    }));

  csvCache.set(y, result);
  return result;
}

function loadDistrictMap(year) {
  const map = new Map();
  const filePath = path.join(BODY_DIR, `up-vidhan-sabha-${year}.json`);
  if (!fs.existsSync(filePath)) return map;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const s of data.seats || []) {
      if (s.district) map.set(s.seatNo, s.district);
    }
  } catch {
    /* ignore */
  }
  return map;
}

function buildDefeatedFromVidhan(year, filters) {
  const groups = loadCsvYear(year);
  if (!groups) return { supported: false, message: "Uttar Pradesh CSV not found." };

  const { search, party, rankMode } = filters;
  const rows = [];

  for (const g of groups) {
    const w = g.winner;
    if (!w) continue;

    const pool = rankMode === "runner-up" ? g.losers.slice(0, 1) : g.losers;

    for (let i = 0; i < pool.length; i += 1) {
      const loser = pool[i];
      const rank = i + 2;
      const marginVotes = Math.max(0, (w.votes || 0) - (loser.votes || 0));
      const marginPercent = Number((w.votePercent - loser.votePercent).toFixed(2));

      rows.push({
        seatNo: g.acNo,
        seatName: g.acName,
        district: g.district,
        rank,
        result: rank === 2 ? "RUNNER_UP" : "LOST",
        candidate: loser.candidate,
        party: loser.party,
        votes: loser.votes,
        votePercent: loser.votePercent,
        polledVotes: g.polledVotes,
        winnerCandidate: w.candidate,
        winnerParty: w.party,
        winnerVotes: w.votes,
        winnerVotePercent: w.votePercent,
        marginVotes,
        marginPercent,
        year: String(year),
        bodyType: "VIDHAN_SABHA",
      });
    }
  }

  return filterDefeatedRows(rows, filters);
}

function buildDefeatedFromLokSabha(year, filters) {
  const data = loadBodyJson("up", "LOK_SABHA", year);
  if (!data?.seats?.length) {
    return { supported: false, message: `Lok Sabha ${year} data not found.` };
  }

  const rows = [];
  for (const seat of data.seats) {
    const ru = seat.runnerUp;
    if (!ru?.candidate) continue;

    const marginVotes = Math.max(0, (seat.votes || 0) - (ru.votes || 0));
    const marginPercent = Number(((seat.votePercent || 0) - (ru.votePercent || 0)).toFixed(2));

    rows.push({
      seatNo: seat.seatNo,
      seatName: seat.seatName,
      district: seat.district || "",
      rank: 2,
      result: "RUNNER_UP",
      candidate: ru.candidate,
      party: ru.party || "Others",
      votes: ru.votes || 0,
      votePercent: ru.votePercent || 0,
      polledVotes: null,
      winnerCandidate: seat.candidate,
      winnerParty: seat.party,
      winnerVotes: seat.votes,
      winnerVotePercent: seat.votePercent,
      marginVotes,
      marginPercent,
      year: String(year),
      bodyType: "LOK_SABHA",
    });
  }

  if (filters.rankMode !== "runner-up") {
    return {
      supported: true,
      partial: true,
      message: "Lok Sabha: runner-up (2nd place) detail available. Full all-candidate list is Vidhan Sabha only.",
      ...filterDefeatedRows(rows, filters),
    };
  }

  return filterDefeatedRows(rows, filters);
}

function filterDefeatedRows(rows, filters) {
  const { search, party } = filters;
  let out = rows;

  if (party && party !== "ALL") {
    out = out.filter((r) => r.party === String(party).toUpperCase());
  }

  if (search?.trim()) {
    const needle = search.trim().toLowerCase();
    const num = parseInt(needle, 10);
    const isSingleAlpha = needle.length === 1 && /^[a-z]$/i.test(needle);
    out = out.filter((r) => {
      if (Number.isFinite(num) && r.seatNo === num) return true;

      const match = (val) => {
        const s = String(val || "").toLowerCase();
        return isSingleAlpha ? s.startsWith(needle) : s.includes(needle);
      };

      return (
        // UI column mapping:
        // - "Lost candidate" = r.candidate
        // - Constituency / District also useful
        match(r.candidate) ||
        match(r.seatName) ||
        match(r.district) ||
        match(r.party)
      );
    });
  }

  const partyBreakdown = {};
  for (const r of out) {
    if (!partyBreakdown[r.party]) partyBreakdown[r.party] = { party: r.party, count: 0, totalVotes: 0 };
    partyBreakdown[r.party].count += 1;
    partyBreakdown[r.party].totalVotes += r.votes || 0;
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(200, Math.max(10, parseInt(filters.limit, 10) || 50));
  const total = out.length;
  const start = (page - 1) * limit;
  const pageRows = out.slice(start, start + limit);

  return {
    supported: true,
    stateCode: "UP",
    stateName: "Uttar Pradesh",
    bodyType: filters.bodyType,
    year: String(filters.year),
    rankMode: filters.rankMode || "all",
    totalDefeated: total,
    matchCount: pageRows.length,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    partyBreakdown: Object.values(partyBreakdown).sort((a, b) => b.count - a.count),
    defeated: pageRows,
    source:
      filters.bodyType === "VIDHAN_SABHA"
        ? "ECI / data-analytics Uttar_Pradesh.csv (all non-winning candidates)"
        : "Wikipedia / ECI — winner vs runner-up",
  };
}

function getDefeatedAnalytics(stateCode, filters = {}) {
  const code = String(stateCode || "").toUpperCase();
  if (code !== "UP") {
    return {
      supported: false,
      message: "Defeated-candidate detail is loaded for Uttar Pradesh (UP) only.",
    };
  }

  const bodyType = String(filters.bodyType || "VIDHAN_SABHA").toUpperCase();
  const year = String(filters.year || (bodyType === "LOK_SABHA" ? "2019" : "2022"));
  const rankMode = filters.rankMode === "runner-up" ? "runner-up" : "all";

  const base = { ...filters, bodyType, year, rankMode };

  if (bodyType === "VIDHAN_SABHA") {
    if (!["2012", "2017", "2022"].includes(year)) {
      return { supported: false, message: "Vidhan Sabha defeated data: years 2012, 2017, 2022 only." };
    }
    return buildDefeatedFromVidhan(year, base);
  }

  if (bodyType === "LOK_SABHA") {
    return buildDefeatedFromLokSabha(year, base);
  }

  return {
    supported: false,
    message: `${bodyType}: runner-up / full defeated list not available yet. Use Vidhan Sabha for all losing candidates.`,
  };
}

function getSeatDefeatDetail(stateCode, filters = {}) {
  const code = String(stateCode || "").toUpperCase();
  if (code !== "UP") {
    return { supported: false, message: "Seat detail is loaded for Uttar Pradesh (UP) only." };
  }

  const bodyType = String(filters.bodyType || "VIDHAN_SABHA").toUpperCase();
  const year = String(filters.year || (bodyType === "LOK_SABHA" ? "2019" : "2022"));
  const seatNo = parseInt(filters.seatNo, 10);
  const highlightCandidate = String(filters.candidate || "").trim();

  if (!Number.isFinite(seatNo) || seatNo < 1) {
    return { supported: false, message: "Invalid seatNo." };
  }

  if (bodyType === "VIDHAN_SABHA") {
    if (!["2012", "2017", "2022"].includes(year)) {
      return { supported: false, message: "Vidhan Sabha seat detail: years 2012, 2017, 2022 only." };
    }
    const groups = loadCsvYear(year);
    if (!groups) return { supported: false, message: "Uttar Pradesh CSV not found." };
    const g = groups.find((x) => x.acNo === seatNo);
    if (!g) return { supported: false, message: "Seat not found." };

    const profiles = loadCandidateProfiles({ stateCode: "UP", bodyType, year });
    const winner = g.winner || null;
    const contestants = (g.candidates || []).map((c, idx) => {
      const rank = idx + 1;
      const marginVotes = winner ? Math.max(0, (winner.votes || 0) - (c.votes || 0)) : 0;
      const marginPercent = winner ? Number(((winner.votePercent || 0) - (c.votePercent || 0)).toFixed(2)) : 0;
      const isWinner = rank === 1;
      const isHighlighted =
        highlightCandidate && String(c.candidate || "").toLowerCase() === highlightCandidate.toLowerCase();
      return {
        rank,
        result: isWinner ? "WINNER" : rank === 2 ? "RUNNER_UP" : "LOST",
        candidate: c.candidate,
        party: c.party,
        votes: c.votes,
        votePercent: c.votePercent,
        marginVotes: isWinner ? 0 : marginVotes,
        marginPercent: isWinner ? 0 : marginPercent,
        highlighted: Boolean(isHighlighted),
        profile: getProfileFor({ profiles, seatNo, candidate: c.candidate }),
      };
    });

    return {
      supported: true,
      stateCode: "UP",
      stateName: "Uttar Pradesh",
      bodyType,
      year,
      seatNo: g.acNo,
      seatName: g.acName,
      district: g.district || "",
      polledVotes: g.polledVotes || 0,
      winner: winner
        ? {
            candidate: winner.candidate,
            party: winner.party,
            votes: winner.votes,
            votePercent: winner.votePercent,
            profile: getProfileFor({ profiles, seatNo, candidate: winner.candidate }),
          }
        : null,
      contestants,
      source: "ECI / data-analytics Uttar_Pradesh.csv (seat-wise contestants)",
    };
  }

  if (bodyType === "LOK_SABHA") {
    const data = loadBodyJson("up", "LOK_SABHA", year);
    if (!data?.seats?.length) return { supported: false, message: `Lok Sabha ${year} data not found.` };
    const seat = (data.seats || []).find((s) => s.seatNo === seatNo);
    if (!seat) return { supported: false, message: "Seat not found." };

    const profiles = loadCandidateProfiles({ stateCode: "UP", bodyType, year });
    const winner = {
      candidate: seat.candidate,
      party: seat.party,
      votes: seat.votes,
      votePercent: seat.votePercent,
      profile: getProfileFor({ profiles, seatNo, candidate: seat.candidate }),
    };
    const ru = seat.runnerUp || null;
    const contestants = [
      {
        rank: 1,
        result: "WINNER",
        candidate: winner.candidate,
        party: winner.party,
        votes: winner.votes,
        votePercent: winner.votePercent,
        marginVotes: 0,
        marginPercent: 0,
        highlighted: Boolean(highlightCandidate && winner.candidate?.toLowerCase() === highlightCandidate.toLowerCase()),
      },
    ];
    if (ru?.candidate) {
      const marginVotes = Math.max(0, (winner.votes || 0) - (ru.votes || 0));
      const marginPercent = Number(((winner.votePercent || 0) - (ru.votePercent || 0)).toFixed(2));
      contestants.push({
        rank: 2,
        result: "RUNNER_UP",
        candidate: ru.candidate,
        party: ru.party || "Others",
        votes: ru.votes || 0,
        votePercent: ru.votePercent || 0,
        marginVotes,
        marginPercent,
        highlighted: Boolean(highlightCandidate && ru.candidate?.toLowerCase() === highlightCandidate.toLowerCase()),
        profile: getProfileFor({ profiles, seatNo, candidate: ru.candidate }),
      });
    }

    return {
      supported: true,
      stateCode: "UP",
      stateName: "Uttar Pradesh",
      bodyType,
      year,
      seatNo: seat.seatNo,
      seatName: seat.seatName,
      district: seat.district || "",
      polledVotes: null,
      winner,
      contestants,
      partial: !ru?.candidate,
      source: "Wikipedia / ECI — winner vs runner-up (seat view)",
    };
  }

  return { supported: false, message: "Unsupported bodyType for seat detail." };
}

module.exports = { getDefeatedAnalytics, getSeatDefeatDetail, loadCsvYear };
