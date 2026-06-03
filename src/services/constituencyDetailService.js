/**
 * Constituency detail service — merges election result data, Wikipedia profiles,
 * and myneta.info affidavit data for a single seat.
 */
const fs = require("fs");
const path = require("path");
const { loadCsvYear } = require("./upElectionLosersService");
const { loadBodyJson } = require("./electionBodyService");

const BODY_DIR = path.join(__dirname, "../../data/election-bodies");
const PROFILE_DIR = path.join(__dirname, "../../data/candidate-profiles");

const mynetaCache = new Map();
const profileCache = new Map();

function normKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function loadMynetaStore() {
  if (mynetaCache.has("store")) return mynetaCache.get("store");
  const filePath = path.join(PROFILE_DIR, "up-vidhan-sabha-2022-myneta.json");
  if (!fs.existsSync(filePath)) {
    mynetaCache.set("store", { byId: {}, bySeat: {} });
    return { byId: {}, bySeat: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    // clear name index so it rebuilds with fresh data
    mynetaNameCache.clear();
    mynetaCache.set("store", data);
    return data;
  } catch {
    mynetaCache.set("store", { byId: {}, bySeat: {} });
    return { byId: {}, bySeat: {} };
  }
}

function loadWikiProfiles(bodyType, year) {
  const key = `wiki:UP:${bodyType}:${year}`;
  if (profileCache.has(key)) return profileCache.get(key);
  const slug = bodyType.toLowerCase().replace(/_/g, "-");
  const filePath = path.join(PROFILE_DIR, `up-${slug}-${year}.json`);
  if (!fs.existsSync(filePath)) {
    profileCache.set(key, { bySeat: {} });
    return { bySeat: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    profileCache.set(key, data);
    return data;
  } catch {
    profileCache.set(key, { bySeat: {} });
    return { bySeat: {} };
  }
}

function getWikiProfile(wikiProfiles, seatNo, candidateName) {
  const seatKey = String(seatNo);
  const nameKey = normKey(candidateName);
  const block = wikiProfiles.bySeat?.[seatKey];
  if (!block) return null;
  if (block[nameKey]) return block[nameKey];
  const simple = nameKey.replace(/[^a-z0-9 ]/g, "");
  for (const [k, v] of Object.entries(block)) {
    if (String(k).replace(/[^a-z0-9 ]/g, "") === simple) return v;
  }
  return null;
}

// Build a name→profile index from byId for fast lookup
const mynetaNameCache = new Map();

function buildMynetaNameIndex(mynetaStore) {
  if (mynetaNameCache.has("built")) return mynetaNameCache.get("index");
  const index = new Map(); // normName → profile
  for (const profile of Object.values(mynetaStore.byId || {})) {
    if (!profile || profile.empty || !profile.name) continue;
    const key = normKey(profile.name);
    index.set(key, profile);
    // also index first+last word combo for fuzzy
    const parts = key.split(" ").filter(Boolean);
    if (parts.length > 1) {
      index.set(`${parts[0]} ${parts[parts.length - 1]}`, profile);
    }
  }
  mynetaNameCache.set("built", true);
  mynetaNameCache.set("index", index);
  return index;
}

function getMynetaProfile(mynetaStore, _constituencyName, candidateName) {
  if (!mynetaStore?.byId) return null;
  const index = buildMynetaNameIndex(mynetaStore);
  const nameKey = normKey(candidateName);

  // 1. exact match
  if (index.has(nameKey)) return index.get(nameKey);

  // 2. strip punctuation
  const simple = nameKey.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  if (index.has(simple)) return index.get(simple);

  // 3. scan for partial match (at least 2 words matching)
  const words = simple.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;
  for (const [k, v] of index.entries()) {
    const kSimple = k.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const matchCount = words.filter((w) => kSimple.includes(w)).length;
    if (matchCount > bestScore && matchCount >= Math.min(2, words.length)) {
      bestScore = matchCount;
      bestMatch = v;
    }
  }
  return bestMatch;
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
  } catch { /* ignore */ }
  return map;
}

function buildCandidateObject({ rank, result, candidate, party, votes, votePercent, marginVotes, marginPercent, seatNo, acName, wikiProfiles, mynetaStore }) {
  const wiki = getWikiProfile(wikiProfiles, seatNo, candidate);
  const myneta = mynetaStore ? getMynetaProfile(mynetaStore, acName, candidate) : null;

  return {
    rank,
    result,
    candidate,
    party,
    votes: votes || 0,
    votePercent: votePercent || 0,
    marginVotes: marginVotes || 0,
    marginPercent: marginPercent || 0,
    personal: {
      age: myneta?.personal?.age || wiki?.personal?.age || null,
      gender: myneta?.personal?.gender || wiki?.personal?.gender || "",
      education: myneta?.personal?.education || wiki?.personal?.education || "",
      profession: myneta?.personal?.profession || wiki?.personal?.profession || "Politician",
    },
    financials: myneta?.financials || { totalAssets: "", totalLiabilities: "" },
    criminal: myneta?.criminal || { totalCases: "" },
    address: myneta?.address || { self: "", permanent: "" },
    bio: wiki?.bio || "",
    wikipedia: wiki?.wikipedia || "",
    social: wiki?.social || { facebook: "", instagram: "", twitter: "", youtube: "", website: "" },
    mynetaUrl: myneta?.mynetaUrl || `https://myneta.info/uttarpradesh2022/`,
  };
}

function getVidhanSabhaDetail(seatNo, year) {
  if (!["2012", "2017", "2022"].includes(year)) {
    return { supported: false, message: "Valid years for Vidhan Sabha: 2012, 2017, 2022." };
  }

  const groups = loadCsvYear(year);
  if (!groups) return { supported: false, message: "Election CSV not found." };

  const g = groups.find((x) => x.acNo === seatNo);
  if (!g) return { supported: false, message: `Seat #${seatNo} not found in Vidhan Sabha ${year}.` };

  const districts = loadDistrictMap(year);
  const district = districts.get(seatNo) || "";

  const wikiProfiles = loadWikiProfiles("VIDHAN_SABHA", year);
  const mynetaStore = year === "2022" ? loadMynetaStore() : null;

  const winner = g.candidates[0] || null;
  const candidates = g.candidates.map((c, idx) => {
    const rank = idx + 1;
    const isWinner = rank === 1;
    const marginVotes = isWinner ? 0 : Math.max(0, (winner?.votes || 0) - (c.votes || 0));
    const marginPercent = isWinner ? 0 : Number(((winner?.votePercent || 0) - (c.votePercent || 0)).toFixed(2));
    return buildCandidateObject({
      rank,
      result: isWinner ? "WINNER" : rank === 2 ? "RUNNER_UP" : "CONTESTED",
      candidate: c.candidate,
      party: c.party,
      votes: c.votes,
      votePercent: c.votePercent,
      marginVotes,
      marginPercent,
      seatNo,
      acName: g.acName,
      wikiProfiles,
      mynetaStore,
    });
  });

  return {
    supported: true,
    stateCode: "UP",
    stateName: "Uttar Pradesh",
    bodyType: "VIDHAN_SABHA",
    year,
    seatNo: g.acNo,
    seatName: g.acName,
    district,
    polledVotes: g.polledVotes || 0,
    totalContestants: candidates.length,
    winnerVoteShare: winner?.votePercent || 0,
    marginVotes: candidates[1] ? Math.max(0, (winner?.votes || 0) - (candidates[1].votes || 0)) : 0,
    winner: candidates[0] || null,
    candidates,
    source: "ECI / Uttar_Pradesh.csv + Wikipedia + myneta.info",
  };
}

function getLokSabhaDetail(seatNo, year) {
  const data = loadBodyJson("up", "LOK_SABHA", year);
  if (!data?.seats?.length) {
    return { supported: false, message: `Lok Sabha ${year} data not found.` };
  }

  const seat = data.seats.find((s) => s.seatNo === seatNo);
  if (!seat) return { supported: false, message: `Seat #${seatNo} not found in Lok Sabha ${year}.` };

  const wikiProfiles = loadWikiProfiles("LOK_SABHA", year);

  const winnerObj = buildCandidateObject({
    rank: 1,
    result: "WINNER",
    candidate: seat.candidate,
    party: seat.party,
    votes: seat.votes,
    votePercent: seat.votePercent,
    marginVotes: 0,
    marginPercent: 0,
    seatNo,
    acName: seat.seatName,
    wikiProfiles,
    mynetaStore: null,
  });

  const candidates = [winnerObj];

  if (seat.runnerUp?.candidate) {
    const marginVotes = Math.max(0, (seat.votes || 0) - (seat.runnerUp.votes || 0));
    const marginPercent = Number(((seat.votePercent || 0) - (seat.runnerUp.votePercent || 0)).toFixed(2));
    candidates.push(
      buildCandidateObject({
        rank: 2,
        result: "RUNNER_UP",
        candidate: seat.runnerUp.candidate,
        party: seat.runnerUp.party || "Others",
        votes: seat.runnerUp.votes,
        votePercent: seat.runnerUp.votePercent,
        marginVotes,
        marginPercent,
        seatNo,
        acName: seat.seatName,
        wikiProfiles,
        mynetaStore: null,
      })
    );
  }

  return {
    supported: true,
    stateCode: "UP",
    stateName: "Uttar Pradesh",
    bodyType: "LOK_SABHA",
    year,
    seatNo: seat.seatNo,
    seatName: seat.seatName,
    district: seat.district || "",
    polledVotes: null,
    totalContestants: candidates.length,
    winnerVoteShare: seat.votePercent || 0,
    marginVotes: candidates[1]?.marginVotes || 0,
    winner: candidates[0] || null,
    candidates,
    partial: !seat.runnerUp?.candidate,
    source: "Wikipedia / ECI — winner vs runner-up (Lok Sabha)",
  };
}

function getConstituencyDetail(stateCode, filters = {}) {
  const code = String(stateCode || "").toUpperCase();
  if (code !== "UP") {
    return { supported: false, message: "Constituency detail available for UP only." };
  }

  const bodyType = String(filters.bodyType || "VIDHAN_SABHA").toUpperCase();
  const year = String(filters.year || (bodyType === "LOK_SABHA" ? "2019" : "2022"));
  const seatNo = parseInt(filters.seatNo, 10);

  if (!Number.isFinite(seatNo) || seatNo < 1) {
    return { supported: false, message: "Invalid seatNo." };
  }

  if (bodyType === "VIDHAN_SABHA") return getVidhanSabhaDetail(seatNo, year);
  if (bodyType === "LOK_SABHA") return getLokSabhaDetail(seatNo, year);

  return { supported: false, message: `${bodyType}: constituency detail not available. Use Vidhan Sabha or Lok Sabha.` };
}

module.exports = { getConstituencyDetail };
