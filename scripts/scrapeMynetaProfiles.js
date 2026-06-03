/**
 * Scrape candidate affidavit data from myneta.info for UP Vidhan Sabha 2022.
 *
 * Usage:
 *   node scripts/scrapeMynetaProfiles.js --start=1 --end=2000 --delay=800
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

function arg(name, fallback) {
  const pref = `--${name}=`;
  const hit = process.argv.find((x) => x.startsWith(pref));
  return hit ? hit.slice(pref.length) : fallback;
}

const START_ID = parseInt(arg("start", "1"), 10);
const END_ID = parseInt(arg("end", "50"), 10);
const DELAY_MS = parseInt(arg("delay", "800"), 10);
const FORCE = arg("force", "false") === "true";
const OUT_DIR = path.join(__dirname, "../data/candidate-profiles");
const OUT_FILE = path.join(OUT_DIR, "up-vidhan-sabha-2022-myneta.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

function loadExisting() {
  if (!fs.existsSync(OUT_FILE)) return { byId: {}, bySeat: {} };
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  } catch {
    return { byId: {}, bySeat: {} };
  }
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

function cleanText(str) {
  return String(str || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePage(html, candidateId) {
  if (!html || html.length < 500) return null;

  // Check if page has real candidate data
  if (!html.includes("w3-card") && !html.includes("Party:")) return null;

  // --- Name from <h2> inside candidate card ---
  const nameM = html.match(/<h2[^>]*>\s*([A-Z][^<]{2,60})\s*<\/h2>/);
  const name = nameM ? nameM[1].trim() : "";

  // --- Party ---
  const partyM = html.match(/<div>\s*<b>Party:<\/b>\s*([^<\n]{1,60})\s*<\/div>/i);
  const party = partyM ? partyM[1].trim() : "";

  // --- Constituency (from breadcrumb or h5) ---
  const constiM = html.match(/<h5[^>]*>\s*([^<]{2,80})\s*<\/h5>/);
  const constituency = constiM ? constiM[1].trim() : "";

  // --- Age: <div><b>Age:</b> 54 </div> ---
  const ageM = html.match(/<div>\s*<b>Age:<\/b>\s*(\d{1,3})\s*<\/div>/i);
  const age = ageM ? parseInt(ageM[1], 10) : null;

  // --- Gender: S/o = Male, D/o = Female, W/o = Female ---
  const relM = html.match(/<div>\s*<b>S\/o\|D\/o\|W\/o:<\/b>\s*([^<]+)<\/div>/i);
  let gender = "";
  if (html.includes("<b>S/o|D/o|W/o:</b>")) {
    // check which relation appears in text context
    if (html.match(/\bS\/o\b/)) gender = "Male";
    else if (html.match(/\bD\/o\b/) || html.match(/\bW\/o\b/)) gender = "Female";
  }

  // --- Self Profession ---
  const profM = html.match(/<b>Self Profession:<\/b>\s*([^\n<]{1,120})/i);
  const profession = profM ? cleanText(profM[1]) : "Politician";

  // --- Assets: <td> Assets: </td><td> <b>Rs&nbsp;4,34,52,000</b>... </td> ---
  const assetsM = html.match(/Assets:\s*<\/td><td>\s*<b>([^<]+)<\/b>/i);
  let totalAssets = "";
  if (assetsM) {
    totalAssets = cleanText(assetsM[1]).replace(/^Rs\s*/, "₹");
    // Also grab the human readable suffix (~4 Crore+)
    const suffixM = html.match(/Assets:\s*<\/td><td>[^~]*~\s*([^<"]+)/i);
    if (suffixM) totalAssets += ` (${cleanText(suffixM[1])})`;
  }

  // --- Liabilities ---
  const liabM = html.match(/Liabilities:\s*<\/td><td>\s*<b>([^<]+)<\/b>/i);
  let totalLiabilities = "";
  if (liabM) {
    totalLiabilities = cleanText(liabM[1]).replace(/^Rs\s*/, "₹");
    const suffixM = html.match(/Liabilities:\s*<\/td><td>[^~]*~\s*([^<"]+)/i);
    if (suffixM) totalLiabilities += ` (${cleanText(suffixM[1])})`;
  }

  // --- Criminal cases from gauge chart data: ['Cases', 0] ---
  const crimM = html.match(/\['Cases',\s*(\d+)\]/);
  const criminalCases = crimM ? crimM[1] : "0";

  // --- Education: Category: 8th Pass <br> ---
  const eduSection = html.match(/Educational Details<\/h3>\s*<hr>\s*Category:\s*([^\n<]{1,80})/i);
  const education = eduSection ? eduSection[1].trim() : "";

  // --- Address (self voter enrollment) ---
  const addrM = html.match(/Name Enrolled as Voter in:\s*<\/b>\s*([^<]{5,200})/i);
  const address = addrM ? cleanText(addrM[1]) : "";

  // --- Candidate photo ---
  const imgM = html.match(/images_candidate\/uttarpradesh2022\/([^'"]+)/);
  const photo = imgM ? `https://myneta.info/images_candidate/uttarpradesh2022/${imgM[1]}` : "";

  if (!name) return null;

  return {
    candidateId: String(candidateId),
    name: name.trim(),
    party: party.trim(),
    constituency: constituency.trim(),
    photo,
    personal: {
      age,
      gender,
      education,
      profession: profession.trim(),
    },
    financials: {
      totalAssets,
      totalLiabilities: totalLiabilities || (liabM ? "Nil" : ""),
    },
    criminal: {
      totalCases: criminalCases,
    },
    address: {
      self: address,
      permanent: "",
    },
    mynetaUrl: `https://myneta.info/uttarpradesh2022/candidate.php?candidate_id=${candidateId}`,
    scrapedAt: new Date().toISOString(),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const store = loadExisting();
  let count = 0;
  let skipped = 0;

  for (let id = START_ID; id <= END_ID; id++) {
    const key = String(id);

    if (!FORCE && store.byId[key] && !store.byId[key].empty) {
      // Re-parse already fetched HTML if available, otherwise skip
      skipped++;
      process.stdout.write(`\r[SKIP] ${id}/${END_ID} (${skipped} skipped, ${count} new)`);
      continue;
    }

    const url = `https://myneta.info/uttarpradesh2022/candidate.php?candidate_id=${id}`;
    try {
      const html = await fetchPage(url);
      const profile = parsePage(html, id);

      if (!profile) {
        store.byId[key] = { candidateId: key, empty: true, scrapedAt: new Date().toISOString() };
        console.log(`\n[EMPTY] id=${id}`);
      } else {
        store.byId[key] = profile;
        // Index by constituency + name
        const constKey = profile.constituency.toLowerCase().replace(/[\s()]+/g, "-").replace(/-+/g, "-");
        if (!store.bySeat[constKey]) store.bySeat[constKey] = {};
        const nameKey = profile.name.toLowerCase().replace(/\s+/g, " ").trim();
        store.bySeat[constKey][nameKey] = profile;
        count++;
        console.log(`\n[OK] id=${id} → ${profile.name} | Age:${profile.personal.age || "-"} | Assets:${profile.financials.totalAssets || "-"} | Cases:${profile.criminal.totalCases} | Edu:${profile.personal.education || "-"}`);
      }

      // Save every 10 records
      if ((count + skipped) % 10 === 0) {
        fs.writeFileSync(OUT_FILE, JSON.stringify(store, null, 2));
      }
    } catch (err) {
      console.error(`\n[ERR] id=${id}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(store, null, 2));
  console.log(`\n\nDone! New records: ${count} | Skipped: ${skipped}`);
  console.log(`Output: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
