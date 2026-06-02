/**
 * Builds JSON datasets for all election body types (UP).
 * Run: node scripts/buildElectionBodies.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(__dirname, "../data/election-bodies");

const PARTY_MAP = {
  BJP: "BJP",
  "Bharatiya Janata Party": "BJP",
  SP: "SP",
  "Samajwadi Party": "SP",
  BSP: "BSP",
  "Bahujan Samaj Party": "BSP",
  INC: "INC",
  "Indian National Congress": "INC",
  RLD: "RLD",
  "Rashtriya Lok Dal": "RLD",
  ADS: "ADS",
  "Apna Dal (Sonelal)": "ADS",
  IND: "IND",
  Independent: "IND",
  AAP: "AAP",
  SBSP: "SBSP",
  Others: "Others",
};

function normalizeParty(raw) {
  const s = String(raw || "")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .trim();
  if (!s) return "Others";
  if (PARTY_MAP[s]) return PARTY_MAP[s];
  const upper = s.toUpperCase();
  if (PARTY_MAP[upper]) return PARTY_MAP[upper];
  if (upper.includes("BJP")) return "BJP";
  if (upper.includes("SAMAJWADI") || upper === "SP") return "SP";
  if (upper.includes("BAHUJAN") || upper === "BSP") return "BSP";
  if (upper.includes("CONGRESS") || upper === "INC") return "INC";
  if (upper.includes("RASHTRIYA LOK") || upper === "RLD") return "RLD";
  if (upper.includes("INDEPENDENT") || upper === "IND") return "IND";
  return "Others";
}

function cleanText(raw) {
  return String(raw || "")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s*\(SC\)\s*/gi, " (SC)")
    .trim();
}

function parseNum(raw) {
  const n = parseInt(String(raw || "").replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function fetchWiki(page) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`;
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "MagnifAI-ElectionBot/1.0" } }, (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).parse.wikitext["*"]);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function isSkipCell(value) {
  const v = String(value || "").trim();
  return (
    !v ||
    v === "-" ||
    /^bgcolor/i.test(v) ||
    /^style=/i.test(v) ||
    /^scope=/i.test(v) ||
    /^colspan/i.test(v) ||
    /^align=/i.test(v) ||
    /^rowspan/i.test(v) ||
    /^\{\{Party color cell/i.test(v) ||
    /^\{\{Efn/i.test(v)
  );
}

function extractCells(row) {
  const cells = [];
  for (const line of row.split("\n").map((l) => l.trim())) {
    if (line.startsWith("!")) {
      const m = line.match(/^!\s*(\d+)\s*$/);
      if (m) cells.push(String(m[1]));
      continue;
    }
    if (!line.startsWith("|")) continue;
    let value = line.slice(1).trim();
    if (value.startsWith("-{{")) continue;
    // scope/style rows often embed the party wikilink — keep the link, skip pure markup
    if (/scope=|style=|bgcolor/i.test(value) && /\[\[/.test(value)) {
      const link = value.match(/\[\[[^\]]+\]\]/);
      if (link) {
        cells.push(link[0]);
        continue;
      }
    }
    if (isSkipCell(value)) continue;
    cells.push(value);
  }
  return cells;
}

function parseConstituencyTable(wikitext, sectionMarker) {
  const start = wikitext.indexOf(sectionMarker);
  if (start < 0) return [];
  const section = wikitext.slice(start);
  const rows = section.split("\n|-");
  const out = [];

  for (const row of rows) {
    const cells = extractCells(row);
    if (cells.length < 6) continue;
    const seatNo = parseInt(cells[0], 10);
    if (!Number.isFinite(seatNo) || seatNo < 1) continue;

    const seatName = cleanText(cells[1]);
    let idx = 2;
    let turnout = null;
    if (/^[\d.]+$/.test(cells[idx]) && parseFloat(cells[idx]) <= 100 && cells[idx].length <= 5) {
      turnout = parseFloat(cells[idx]);
      idx += 1;
    }

    const candidate = cleanText(cells[idx]);
    idx += 1;
    const party = normalizeParty(cells[idx]);
    idx += 1;
    const votes = parseNum(cells[idx]);
    idx += 1;
    let votePercent = 0;
    if (cells[idx] && /^[\d.]+$/.test(String(cells[idx]).replace(/,/g, ""))) {
      votePercent = parseFloat(cells[idx]);
    }
    idx += 1;

    let runnerUp = null;
    if (cells[idx] && /\[\[/.test(cells[idx])) {
      const ruCandidate = cleanText(cells[idx]);
      idx += 1;
      const ruParty = normalizeParty(cells[idx]);
      idx += 1;
      const ruVotes = parseNum(cells[idx]);
      idx += 1;
      let ruPercent = 0;
      if (cells[idx] && /^[\d.]+$/.test(String(cells[idx]).replace(/,/g, ""))) {
        ruPercent = parseFloat(cells[idx]);
      }
      runnerUp = { candidate: ruCandidate, party: ruParty, votes: ruVotes, votePercent: ruPercent };
    }

    out.push({ seatNo, seatName, party, candidate, votes, votePercent, turnout, runnerUp });
  }
  return out;
}

function aggregatePartyStats(seats) {
  const counts = {};
  let totalVotes = 0;
  for (const s of seats) {
    const p = s.party || "Others";
    if (!counts[p]) counts[p] = { party: p, seats: 0, votes: 0 };
    counts[p].seats += 1;
    counts[p].votes += s.votes || 0;
    totalVotes += s.votes || 0;
  }
  return Object.values(counts)
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes)
    .map((p) => ({
      ...p,
      voteShare: totalVotes ? Number(((p.votes / totalVotes) * 100).toFixed(2)) : 0,
    }));
}

function parseCsvWinners(csvPath, year) {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.trim().split("\n").slice(1);
  const byAc = new Map();
  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length < 8) continue;
    const acName = parts[1];
    const acNo = parseInt(parts[2], 10);
    const yearVal = parseInt(parts[6], 10);
    if (yearVal !== year) continue;
    const party = normalizeParty(parts[4]);
    const candidate = parts[3];
    const votes = parseNum(parts[5]);
    const polled = parseNum(parts[7]);
    const votePercent = parseFloat(parts[8]) || 0;
    const cur = byAc.get(acNo);
    if (!cur || votes > cur.votes) {
      byAc.set(acNo, { seatNo: acNo, seatName: acName, party, candidate, votes, votePercent, polledVotes: polled });
    }
  }
  return [...byAc.values()].sort((a, b) => a.seatNo - b.seatNo);
}

function parseMunicipalMayors(wikitext) {
  const start = wikitext.indexOf("Municipal Corporation");
  if (start < 0) return [];
  const section = wikitext.slice(start, start + 12000);
  const rows = section.split("\n|-");
  const out = [];
  for (const row of rows) {
    const cells = extractCells(row);
    if (cells.length < 4) continue;
    const seatNo = parseInt(cells[0], 10);
    if (!Number.isFinite(seatNo) || seatNo > 17) continue;
    const corpRaw = cleanText(cells[1]);
    if (!corpRaw.toLowerCase().includes("municipal")) continue;
    out.push({
      seatNo,
      seatName: corpRaw.replace(/\s+Municipal Corporation/i, ""),
      district: cleanText(cells[2]),
      party: "BJP",
      candidate: cleanText(cells[3]),
      votes: 0,
      votePercent: 0,
      note: "Mayor — BJP won all 17 Nagar Nigam seats (2023)",
    });
  }
  return out;
}

function parseMunicipalWardSummary(wikitext) {
  const marker = "Agra Municipal Corporation";
  const idx = wikitext.indexOf(marker);
  if (idx < 0) return [];
  const chunk = wikitext.slice(idx, idx + 25000);
  const rows = chunk.split("\n|-");
  const out = [];
  for (const row of rows) {
    const cells = extractCells(row);
    if (cells.length < 6) continue;
    const seatNo = parseInt(cells[0], 10);
    if (!Number.isFinite(seatNo) || seatNo > 17) continue;
    const corp = cleanText(cells[1]);
    if (!/municipal corporation/i.test(corp)) continue;
    const nums = cells.slice(2).map((c) => parseInt(String(c).replace(/,/g, ""), 10)).filter(Number.isFinite);
    if (nums.length < 5) continue;
    out.push({
      seatNo,
      seatName: corp.replace(/\s+Municipal Corporation/i, ""),
      totalWards: nums[0] || 0,
      wardBreakdown: {
        BJP: nums[1] || 0,
        SP: nums[2] || 0,
        BSP: nums[3] || 0,
        INC: nums[4] || 0,
        Others: nums[5] || 0,
      },
    });
  }
  return out;
}

const MLC_2022_SEATS = [
  { seatNo: 1, seatName: "Budaun", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 2, seatName: "Hardoi", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 3, seatName: "Kheri", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 4, seatName: "Mirzapur-Sonbhadra", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 5, seatName: "Banda-Hamirpur", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 6, seatName: "Aligarh", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 7, seatName: "Bulandshahr", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 8, seatName: "Mathura-Etah-Mainpuri", party: "BJP", candidate: "Unopposed", votes: 0 },
  { seatNo: 9, seatName: "Moradabad-Bijnor", party: "BJP", candidate: "Satyapal Saini", votes: 0 },
  { seatNo: 10, seatName: "Jhansi-Jalaun-Lalitpur", party: "BJP", candidate: "Rama Niranjan", votes: 0 },
  { seatNo: 11, seatName: "Meerut-Ghaziabad", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 12, seatName: "Muzaffarnagar-Saharanpur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 13, seatName: "Rampur-Bareilly", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 14, seatName: "Pilibhit-Shahjahanpur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 15, seatName: "Sitapur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 16, seatName: "Lucknow-Unnao", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 17, seatName: "Rae Bareli", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 18, seatName: "Allahabad-Jaunpur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 19, seatName: "Varanasi", party: "IND", candidate: "Annapurna Singh", votes: 4234 },
  { seatNo: 20, seatName: "Ghazipur-Mau", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 21, seatName: "Azamgarh-Mau", party: "IND", candidate: "Independent", votes: 0 },
  { seatNo: 22, seatName: "Pratapgarh", party: "IND", candidate: "Independent", votes: 0 },
  { seatNo: 23, seatName: "Faizabad-Ambedkar Nagar", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 24, seatName: "Sultanpur-Amethi", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 25, seatName: "Bahraich-Shravasti", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 26, seatName: "Gonda-Balrampur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 27, seatName: "Basti-Siddharthnagar", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 28, seatName: "Gorakhpur-Maharajganj", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 29, seatName: "Deoria-Kushinagar", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 30, seatName: "Ballia", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 31, seatName: "Bijnor", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 32, seatName: "Agra-Firozabad", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 33, seatName: "Kanpur-Fatehpur", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 34, seatName: "Etawah-Farrukhabad", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 35, seatName: "Bareilly-Pilibhit", party: "BJP", candidate: "BJP candidate", votes: 0 },
  { seatNo: 36, seatName: "Saharanpur-Muzaffarnagar", party: "BJP", candidate: "BJP candidate", votes: 0 },
];

function dedupeSeats(seats, maxSeats) {
  const byNo = new Map();
  for (const s of seats) {
    const cur = byNo.get(s.seatNo);
    if (!cur || (s.votes || 0) > (cur.votes || 0)) byNo.set(s.seatNo, s);
  }
  const out = [...byNo.values()].sort((a, b) => a.seatNo - b.seatNo);
  return maxSeats ? out.filter((s) => s.seatNo <= maxSeats) : out;
}

function writeBody(fileName, payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (payload.seats) {
    const max = payload.totalSeats || null;
    payload.seats = dedupeSeats(payload.seats, max);
    payload.partyStats = aggregatePartyStats(payload.seats);
  }
  const filePath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  // eslint-disable-next-line no-console
  console.log(`  → ${payload.seats.length} seats → ${filePath}`);
}

async function main() {
  const csvPath = path.join(__dirname, "../data/Uttar_Pradesh.csv");

  // Vidhan Sabha 2022 from CSV
  if (fs.existsSync(csvPath)) {
    for (const year of [2012, 2017, 2022]) {
      const seats = parseCsvWinners(csvPath, year);
      writeBody(`up-vidhan-sabha-${year}.json`, {
        stateCode: "UP",
        bodyType: "VIDHAN_SABHA",
        role: "MLA",
        year,
        totalSeats: 403,
        source: "ECI / data-analytics Uttar_Pradesh.csv",
        partyStats: aggregatePartyStats(seats),
        seats,
      });
    }
  }

  // Lok Sabha 2019
  // eslint-disable-next-line no-console
  console.log("Fetching Lok Sabha 2019…");
  const lsWiki = await fetchWiki("2019_Indian_general_election_in_Uttar_Pradesh");
  const lsSeats = parseConstituencyTable(lsWiki, "== Results by constituency ==");
  writeBody("up-lok-sabha-2019.json", {
    stateCode: "UP",
    bodyType: "LOK_SABHA",
    role: "MP",
    year: 2019,
    totalSeats: 80,
    source: "Wikipedia / ECI — 2019 general election",
    partyStats: aggregatePartyStats(lsSeats),
    seats: lsSeats,
  });

  // MLC 2022
  writeBody("up-mlc-2022.json", {
    stateCode: "UP",
    bodyType: "MLC",
    role: "MLC",
    year: 2022,
    totalSeats: 36,
    source: "ECI local authorities biennial election 2022 (33 BJP, 3 IND, 0 SP)",
    partyStats: aggregatePartyStats(MLC_2022_SEATS),
    seats: MLC_2022_SEATS,
  });

  // Municipal 2023
  // eslint-disable-next-line no-console
  console.log("Fetching Municipal 2023…");
  const munWiki = await fetchWiki("2023_Uttar_Pradesh_local_elections");
  const mayors = parseMunicipalMayors(munWiki);
  const wards = parseMunicipalWardSummary(munWiki);
  const municipalSeats = mayors.map((m) => {
    const w = wards.find((x) => x.seatNo === m.seatNo);
    return { ...m, totalWards: w?.totalWards || 0, wardBreakdown: w?.wardBreakdown || null };
  });
  writeBody("up-municipal-2023.json", {
    stateCode: "UP",
    bodyType: "MUNICIPAL",
    role: "Mayor",
    year: 2023,
    totalSeats: 17,
    totalUrbanBodies: 760,
    source: "Wikipedia / SEC UP — Nagar Nigam elections May 2023",
    partyStats: [
      { party: "BJP", seats: 17, votes: 0, voteShare: 100 },
      { party: "SP", seats: 0, votes: 0, voteShare: 0 },
      { party: "BSP", seats: 0, votes: 0, voteShare: 0 },
    ],
    summary: {
      nagarNigamMayor: { BJP: 17, SP: 0, BSP: 0, INC: 0 },
      nagarPalikaChairman: { BJP: 89, SP: 35, BSP: 16, INC: 4, Others: 55 },
      nagarPanchayatChairman: { BJP: 191, SP: 79, BSP: 37, INC: 14, Others: 223 },
    },
    seats: municipalSeats,
  });

  // eslint-disable-next-line no-console
  console.log("Done.");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
