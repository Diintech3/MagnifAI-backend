/**
 * Enrich candidate profile JSON with publicly available metadata from Wikipedia.
 *
 * Usage examples:
 *   node scripts/enrichCandidateProfiles.js --bodyType=VIDHAN_SABHA --year=2022 --limit=200 --top=2
 *   node scripts/enrichCandidateProfiles.js --bodyType=LOK_SABHA --year=2019 --limit=80 --top=2
 */
const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "../data/Uttar_Pradesh.csv");
const BODY_DIR = path.join(__dirname, "../data/election-bodies");
const PROFILE_DIR = path.join(__dirname, "../data/candidate-profiles");

function arg(name, fallback) {
  const pref = `--${name}=`;
  const hit = process.argv.find((x) => x.startsWith(pref));
  return hit ? hit.slice(pref.length) : fallback;
}

const bodyType = String(arg("bodyType", "VIDHAN_SABHA")).toUpperCase();
const year = String(arg("year", bodyType === "LOK_SABHA" ? "2019" : "2022"));
const top = Math.max(1, Number(arg("top", "2")) || 2);
const limit = Math.max(1, Number(arg("limit", "150")) || 150);

function normNameKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseNum(raw) {
  const n = parseInt(String(raw || "").replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function normalizeParty(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (s.includes("BJP")) return "BJP";
  if (s === "SP" || s.includes("SAMAJWADI")) return "SP";
  if (s === "BSP" || s.includes("BAHUJAN")) return "BSP";
  if (s === "INC" || s.includes("CONGRESS")) return "INC";
  if (s === "RLD") return "RLD";
  if (s.includes("IND")) return "IND";
  if (s === "AAP") return "AAP";
  return "Others";
}

function defaultProfile() {
  return {
    phone: "",
    email: "",
    address: { line1: "", line2: "", city: "", district: "", state: "Uttar Pradesh", pincode: "" },
    social: { facebook: "", instagram: "", twitter: "", youtube: "", website: "" },
    personal: { age: null, gender: "", education: "", profession: "", assets: "", liabilities: "" },
    bio: "",
    wikipedia: "",
    source: "Wikipedia (auto-enriched)",
    lastUpdatedAt: new Date().toISOString(),
  };
}

function loadExistingProfiles(filePath) {
  if (!fs.existsSync(filePath)) return { bySeat: {} };
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { bySeat: data.bySeat || {} };
  } catch {
    return { bySeat: {} };
  }
}

function collectCandidates() {
  if (bodyType === "VIDHAN_SABHA") {
    const text = fs.readFileSync(CSV_PATH, "utf8");
    const lines = text.trim().split("\n").slice(1);
    const bySeat = new Map();
    for (const line of lines) {
      const p = line.split(",");
      if (p.length < 9) continue;
      if (String(parseInt(p[6], 10)) !== year) continue;
      const seatNo = parseInt(p[2], 10);
      if (!Number.isFinite(seatNo)) continue;
      if (!bySeat.has(seatNo)) bySeat.set(seatNo, []);
      bySeat.get(seatNo).push({
        seatNo,
        seatName: p[1],
        candidate: p[3],
        party: normalizeParty(p[4]),
        votes: parseNum(p[5]),
      });
    }
    const out = [];
    for (const arr of bySeat.values()) {
      arr.sort((a, b) => b.votes - a.votes);
      out.push(...arr.slice(0, top));
    }
    return out;
  }

  if (bodyType === "LOK_SABHA") {
    const filePath = path.join(BODY_DIR, "up-lok-sabha-2019.json");
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const out = [];
    for (const s of data.seats || []) {
      out.push({
        seatNo: s.seatNo,
        seatName: s.seatName,
        candidate: s.candidate,
        party: s.party || "Others",
        votes: s.votes || 0,
      });
      if (top > 1 && s.runnerUp?.candidate) {
        out.push({
          seatNo: s.seatNo,
          seatName: s.seatName,
          candidate: s.runnerUp.candidate,
          party: s.runnerUp.party || "Others",
          votes: s.runnerUp.votes || 0,
        });
      }
    }
    return out;
  }

  return [];
}

async function wikiSearchTitle(name, seatName) {
  const q = `${name} ${seatName} Uttar Pradesh politician`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&utf8=1&srlimit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "MagnifAI-Profile-Enricher/1.0" } });
  if (!res.ok) return "";
  const data = await res.json();
  return data?.query?.search?.[0]?.title || "";
}

function pickSocial(extlinks, domain) {
  return extlinks.find((x) => String(x).toLowerCase().includes(domain)) || "";
}

function pickWebsite(extlinks) {
  const blocked = ["twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be"];
  for (const u of extlinks) {
    const lower = String(u).toLowerCase();
    if (!blocked.some((b) => lower.includes(b))) return u;
  }
  return "";
}

async function wikiDetails(title) {
  if (!title) return null;
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|extlinks&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&ellimit=500&format=json&utf8=1`;
  const res = await fetch(url, { headers: { "User-Agent": "MagnifAI-Profile-Enricher/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing) return null;

  const extract = String(page.extract || "");
  const extlinks = (page.extlinks || []).map((x) => x["*"]).filter(Boolean);
  return {
    wikipedia: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    bio: extract.split("\n")[0] || extract.slice(0, 280),
    social: {
      twitter: pickSocial(extlinks, "twitter.com") || pickSocial(extlinks, "x.com"),
      facebook: pickSocial(extlinks, "facebook.com"),
      instagram: pickSocial(extlinks, "instagram.com"),
      youtube: pickSocial(extlinks, "youtube.com") || pickSocial(extlinks, "youtu.be"),
      website: pickWebsite(extlinks),
    },
  };
}

async function main() {
  const profileFile = path.join(PROFILE_DIR, `up-${bodyType.toLowerCase().replace(/_/g, "-")}-${year}.json`);
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const existing = loadExistingProfiles(profileFile);
  const candidates = collectCandidates().slice(0, limit);

  let enrichedCount = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    const seatKey = String(c.seatNo);
    const nameKey = normNameKey(c.candidate);
    if (!existing.bySeat[seatKey]) existing.bySeat[seatKey] = {};
    const cur = existing.bySeat[seatKey][nameKey] || defaultProfile();

    // Skip if already enriched
    if (cur.wikipedia || cur.social?.twitter || cur.social?.facebook || cur.social?.instagram || cur.social?.website) {
      existing.bySeat[seatKey][nameKey] = { ...defaultProfile(), ...cur };
      continue;
    }

    const title = await wikiSearchTitle(c.candidate, c.seatName);
    const details = await wikiDetails(title);
    if (details) {
      existing.bySeat[seatKey][nameKey] = {
        ...defaultProfile(),
        ...cur,
        wikipedia: details.wikipedia || cur.wikipedia || "",
        bio: details.bio || cur.bio || "",
        social: {
          ...(cur.social || {}),
          ...(details.social || {}),
        },
        personal: {
          ...(cur.personal || {}),
          profession: cur.personal?.profession || "Politician",
        },
        source: "Wikipedia (auto-enriched)",
        lastUpdatedAt: new Date().toISOString(),
      };
      enrichedCount += 1;
    } else {
      existing.bySeat[seatKey][nameKey] = { ...defaultProfile(), ...cur };
    }

    // Light throttle to avoid API abuse
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 180));
    // eslint-disable-next-line no-console
    console.log(`[${i + 1}/${candidates.length}] ${c.candidate} (${c.seatName})`);
  }

  fs.writeFileSync(profileFile, JSON.stringify(existing, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Done. Updated: ${profileFile}`);
  // eslint-disable-next-line no-console
  console.log(`Enriched records: ${enrichedCount}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

