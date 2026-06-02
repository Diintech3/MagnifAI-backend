/**
 * Parses Wikipedia constituency result tables (ECI-sourced) into JSON for seeding.
 * Run: node scripts/buildUpElectionData.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const PAGES = [
  { year: 2012, page: "2012_Uttar_Pradesh_Legislative_Assembly_election" },
  { year: 2017, page: "2017_Uttar_Pradesh_Legislative_Assembly_election" },
  { year: 2022, page: "2022_Uttar_Pradesh_Legislative_Assembly_election" },
];

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
  AAP: "AAP",
  SBSP: "SBSP",
  ADS: "ADS",
  "Apna Dal (Sonelal)": "ADS",
  NISHAD: "NISHAD",
  IND: "IND",
  Independent: "IND",
  CPI: "CPI",
  CPM: "CPM",
};

function normalizeParty(raw) {
  const s = String(raw || "")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/<[^>]+>/g, "")
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
    /^colspan/i.test(v) ||
    /^align=/i.test(v) ||
    /^rowspan/i.test(v)
  );
}

function extractCells(row) {
  const cells = [];
  const lines = row.split("\n").map((l) => l.trim());
  for (const line of lines) {
    if (line.startsWith("!")) {
      const m = line.match(/^!\s*(\d+)\s*$/);
      if (m) cells.push(String(m[1]));
      continue;
    }
    if (!line.startsWith("|")) continue;
    const value = line.slice(1).trim();
    if (isSkipCell(value)) continue;
    cells.push(value);
  }
  return cells;
}

function parseConstituencySection(wikitext) {
  const marker = "=== Results by constituency ===";
  const start = wikitext.indexOf(marker);
  if (start < 0) return [];
  const section = wikitext.slice(start);
  const rows = section.split("\n|-");
  const out = [];
  let district = "";

  for (const row of rows) {
    if (row.includes("District'''</span>")) {
      const dm = row.match(/'''([^']+) District'''/i);
      if (dm) district = dm[1].trim();
      continue;
    }

    const cells = extractCells(row);
    if (cells.length < 6) continue;

    const acNo = parseInt(cells[0], 10);
    if (!Number.isFinite(acNo) || acNo < 1 || acNo > 500) continue;

    const acName = cleanText(cells[1]);
    let idx = 2;
    let turnout = null;
    if (/^[\d.]+$/.test(cells[idx]) && parseFloat(cells[idx]) <= 100) {
      turnout = parseFloat(cells[idx]);
      idx += 1;
    }

    const winnerCandidate = cleanText(cells[idx]);
    const winnerParty = normalizeParty(cells[idx + 1]);
    const winnerVotes = parseNum(cells[idx + 2]);
    let winnerPct = 0;
    if (cells[idx + 3] && /^[\d.]+$/.test(cells[idx + 3]) && parseFloat(cells[idx + 3]) <= 100) {
      winnerPct = parseFloat(cells[idx + 3]);
      idx += 4;
    } else {
      idx += 3;
    }

    const runnerCandidate = cleanText(cells[idx]);
    const runnerParty = normalizeParty(cells[idx + 1]);
    const runnerVotes = parseNum(cells[idx + 2]);
    const margin = parseNum(cells[cells.length - 1]);

    out.push({
      acNo,
      acName,
      district,
      turnout,
      party: winnerParty,
      candidate: winnerCandidate,
      votes: winnerVotes,
      votePercent: winnerPct,
      runnerUpParty: runnerParty,
      runnerUpCandidate: runnerCandidate,
      runnerUpVotes: runnerVotes,
      margin,
    });
  }
  return out;
}

function assignCoords(records) {
  const minLat = 23.5;
  const maxLat = 31.0;
  const minLng = 77.0;
  const maxLng = 84.5;
  const cols = 20;
  const rows = Math.ceil(records.length / cols);
  return records.map((r) => {
    const idx = r.acNo - 1;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const lat = minLat + ((row + 0.5) / rows) * (maxLat - minLat);
    const lng = minLng + ((col + 0.5) / cols) * (maxLng - minLng);
    return { ...r, lat, lng };
  });
}

async function main() {
  const byYear = {};
  for (const { year, page } of PAGES) {
    // eslint-disable-next-line no-console
    console.log(`Fetching ${year}…`);
    const wt = await fetchWiki(page);
    byYear[year] = parseConstituencySection(wt);
    // eslint-disable-next-line no-console
    console.log(`  → ${byYear[year].length} constituencies`);
  }

  const baseYear = byYear[2022]?.length ? 2022 : byYear[2017]?.length ? 2017 : 2012;
  const base = assignCoords(byYear[baseYear] || []);
  const merged = base.map((row) => {
    const y2012 = byYear[2012]?.find((x) => x.acNo === row.acNo);
    const y2017 = byYear[2017]?.find((x) => x.acNo === row.acNo);
    const y2022 = byYear[2022]?.find((x) => x.acNo === row.acNo) || row;
    return {
      stateCode: "UP",
      acNo: row.acNo,
      acName: y2022.acName || row.acName,
      district: y2022.district || row.district,
      lat: row.lat,
      lng: row.lng,
      results: {
        2012: y2012
          ? {
              party: y2012.party,
              candidate: y2012.candidate,
              votes: y2012.votes,
              votePercent: y2012.votePercent,
            }
          : null,
        2017: y2017
          ? {
              party: y2017.party,
              candidate: y2017.candidate,
              votes: y2017.votes,
              votePercent: y2017.votePercent,
            }
          : null,
        2022: {
          party: y2022.party,
          candidate: y2022.candidate,
          votes: y2022.votes,
          votePercent: y2022.votePercent,
          runnerUpParty: y2022.runnerUpParty,
          runnerUpCandidate: y2022.runnerUpCandidate,
          runnerUpVotes: y2022.runnerUpVotes,
          margin: y2022.margin,
          turnout: y2022.turnout,
        },
      },
    };
  });

  const outPath = path.join(__dirname, "../data/up-assembly-results.json");
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${merged.length} records → ${outPath}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
