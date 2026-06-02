/** State-level electoral analytics dataset (admin operations) */
const ELECTION_STATES = [
  {
    code: "UP",
    name: "Uttar Pradesh",
    capital: "Lucknow",
    region: "North",
    totalSeats: 80,
    assemblySeats: 403,
    phases: 7,
    electorate: "15.0 Cr",
    turnout: "66.0%",
    leadingParty: "BJP",
    margin: "5.2%",
    status: "High stakes",
    partyBreakdown: [
      { party: "BJP", seats: 33, voteShare: "41.2%", trend: "up" },
      { party: "SP", seats: 22, voteShare: "32.1%", trend: "stable" },
      { party: "BSP", seats: 9, voteShare: "12.8%", trend: "down" },
      { party: "INC", seats: 6, voteShare: "8.4%", trend: "down" },
      { party: "Others", seats: 10, voteShare: "5.5%", trend: "stable" },
    ],
    demographics: [
      { label: "Rural", value: "77%" },
      { label: "Urban", value: "23%" },
      { label: "Youth (18–35)", value: "42%" },
      { label: "Women voters", value: "48%" },
    ],
    swingRegions: ["Purvanchal", "Bundelkhand", "Western UP", "Awadh"],
    districtHighlights: [
      { district: "Lucknow", note: "Capital seat; high media visibility" },
      { district: "Varanasi", note: "National spotlight; premium campaigning" },
      { district: "Gorakhpur", note: "Eastern belt swing zone" },
      { district: "Meerut", note: "NCR influence; urban youth heavy" },
    ],
    analysis: {
      summary:
        "UP remains India's largest electoral battleground. Caste arithmetic, alliance shifts, and Purvanchal turnout will decide margins. Digital penetration is rising fast in tier-2 cities.",
      strengths: ["Massive electorate", "Strong party machinery on ground", "High rally conversion in rural belts"],
      risks: ["Fragmented third-front votes", "Local incumbency anti-wave in pockets", "Weather/disruption in peak phase"],
      recommendation: "Focus Purvanchal + 12 swing seats; run localized issue packs per district cluster.",
    },
    news: [
      { title: "Phase-wise polling schedule finalized", date: "2026-05-28", source: "ECI Bulletin" },
      { title: "Alliance talks intensify in western belt", date: "2026-05-27", source: "State Desk" },
    ],
  },
  {
    code: "BR",
    name: "Bihar",
    capital: "Patna",
    region: "East",
    totalSeats: 40,
    assemblySeats: 243,
    phases: 4,
    electorate: "7.4 Cr",
    turnout: "58.5%",
    leadingParty: "RJD",
    margin: "3.1%",
    status: "Competitive",
    partyBreakdown: [
      { party: "RJD", seats: 16, voteShare: "28.6%", trend: "up" },
      { party: "BJP", seats: 14, voteShare: "26.4%", trend: "stable" },
      { party: "JDU", seats: 6, voteShare: "15.2%", trend: "down" },
      { party: "INC", seats: 2, voteShare: "9.1%", trend: "stable" },
      { party: "Others", seats: 2, voteShare: "20.7%", trend: "up" },
    ],
    demographics: [
      { label: "Rural", value: "89%" },
      { label: "Urban", value: "11%" },
      { label: "Youth (18–35)", value: "38%" },
      { label: "Women voters", value: "47%" },
    ],
    swingRegions: ["Seemanchal", "Mithilanchal", "Magadh", "Bhojpur"],
    districtHighlights: [
      { district: "Patna", note: "Urban governance narrative dominant" },
      { district: "Gaya", note: "Magadh region swing" },
      { district: "Purnia", note: "Seemanchal demographic mix" },
    ],
    analysis: {
      summary:
        "Bihar elections are coalition-driven with strong caste-community voting. Turnout volatility in rural blocks can swing 4–6 seats.",
      strengths: ["Ground network density", "Issue-based micro targeting", "Strong regional media"],
      risks: ["Coalition seat-sharing disputes", "Low urban turnout risk", "Migration-season absentee voters"],
      recommendation: "Deploy booth-level dashboards in Magadh + Seemanchal; bilingual content for youth voters.",
    },
    news: [
      { title: "Coalition seat matrix under review", date: "2026-05-26", source: "Patna Bureau" },
    ],
  },
  {
    code: "MH",
    name: "Maharashtra",
    capital: "Mumbai",
    region: "West",
    totalSeats: 48,
    assemblySeats: 288,
    phases: 5,
    electorate: "9.0 Cr",
    turnout: "61.2%",
    leadingParty: "BJP",
    margin: "4.8%",
    status: "Urban-heavy",
    partyBreakdown: [
      { party: "BJP", seats: 20, voteShare: "34.5%", trend: "up" },
      { party: "SS", seats: 12, voteShare: "18.2%", trend: "stable" },
      { party: "NCP", seats: 8, voteShare: "14.6%", trend: "down" },
      { party: "INC", seats: 5, voteShare: "12.1%", trend: "stable" },
      { party: "Others", seats: 3, voteShare: "20.6%", trend: "up" },
    ],
    demographics: [
      { label: "Rural", value: "54%" },
      { label: "Urban", value: "46%" },
      { label: "Youth (18–35)", value: "44%" },
      { label: "Women voters", value: "49%" },
    ],
    swingRegions: ["Mumbai Metro", "Pune", "Marathwada", "Vidarbha"],
    districtHighlights: [
      { district: "Mumbai", note: "Premium ad market; influencer-led campaigns" },
      { district: "Pune", note: "IT/education hub; digital-first voters" },
      { district: "Nagpur", note: "Vidarbha narrative pivot" },
    ],
    analysis: {
      summary:
        "Maharashtra blends urban digital campaigns with strong regional party networks. Vidarbha and Marathwada are key swing belts.",
      strengths: ["High ad spend efficiency in metros", "Strong volunteer networks", "Multilingual content reach"],
      risks: ["Split Marathi-urban vote", "Alliance fragmentation", "High campaign costs"],
      recommendation: "Metro digital blitz + Marathwada ground tours; track ward-level sentiment daily.",
    },
    news: [{ title: "Urban ward committees activated statewide", date: "2026-05-25", source: "Mumbai Desk" }],
  },
  {
    code: "RJ",
    name: "Rajasthan",
    capital: "Jaipur",
    region: "North",
    totalSeats: 25,
    assemblySeats: 200,
    phases: 2,
    electorate: "5.0 Cr",
    turnout: "74.1%",
    leadingParty: "INC",
    margin: "2.4%",
    status: "Flip state",
    partyBreakdown: [
      { party: "INC", seats: 13, voteShare: "39.8%", trend: "up" },
      { party: "BJP", seats: 11, voteShare: "38.2%", trend: "down" },
      { party: "Others", seats: 1, voteShare: "22.0%", trend: "stable" },
    ],
    demographics: [
      { label: "Rural", value: "75%" },
      { label: "Urban", value: "25%" },
      { label: "Youth (18–35)", value: "40%" },
      { label: "Women voters", value: "48%" },
    ],
    swingRegions: ["Marwar", "Mewar", "Shekhawati", "Eastern Rajasthan"],
    districtHighlights: [
      { district: "Jaipur", note: "Capital region high visibility" },
      { district: "Jodhpur", note: "Marwar swing belt" },
    ],
    analysis: {
      summary: "Rajasthan alternates governments frequently. Rural water, jobs, and local leadership dominate.",
      strengths: ["High turnout culture", "Clear regional issues", "Strong fair/festival campaigning"],
      risks: ["Anti-incumbency waves", "Heat-season turnout dip"],
      recommendation: "Shekhawati + Mewar micro-targeting with women-centric messaging.",
    },
    news: [],
  },
  {
    code: "WB",
    name: "West Bengal",
    capital: "Kolkata",
    region: "East",
    totalSeats: 42,
    assemblySeats: 294,
    phases: 6,
    electorate: "7.3 Cr",
    turnout: "82.0%",
    leadingParty: "AITC",
    margin: "6.0%",
    status: "Organized ground game",
    partyBreakdown: [
      { party: "AITC", seats: 24, voteShare: "44.1%", trend: "stable" },
      { party: "BJP", seats: 12, voteShare: "32.5%", trend: "up" },
      { party: "INC", seats: 2, voteShare: "7.2%", trend: "down" },
      { party: "Left", seats: 2, voteShare: "6.8%", trend: "down" },
      { party: "Others", seats: 2, voteShare: "9.4%", trend: "stable" },
    ],
    demographics: [
      { label: "Rural", value: "68%" },
      { label: "Urban", value: "32%" },
      { label: "Youth (18–35)", value: "41%" },
      { label: "Women voters", value: "49%" },
    ],
    swingRegions: ["North Bengal", "Hooghly", "Jangalmahal", "Kolkata Metro"],
    districtHighlights: [
      { district: "Kolkata", note: "Media capital of east; debate-heavy" },
      { district: "Darjeeling", note: "Hill region distinct issues" },
    ],
    analysis: {
      summary: "West Bengal has among the highest turnouts. Ground mobilization and local club networks are decisive.",
      strengths: ["Exceptional turnout", "Dense volunteer culture", "Regional media influence"],
      risks: ["Polarized narratives", "Law-and-order sensitivity in pockets"],
      recommendation: "North Bengal + Jangalmahal ground reports; monitor booth management KPIs hourly on poll day.",
    },
    news: [],
  },
  {
    code: "TN",
    name: "Tamil Nadu",
    capital: "Chennai",
    region: "South",
    totalSeats: 39,
    assemblySeats: 234,
    phases: 1,
    electorate: "6.2 Cr",
    turnout: "72.4%",
    leadingParty: "DMK",
    margin: "7.5%",
    status: "Dravidian duel",
    partyBreakdown: [
      { party: "DMK", seats: 22, voteShare: "38.6%", trend: "stable" },
      { party: "AIADMK", seats: 14, voteShare: "31.2%", trend: "down" },
      { party: "BJP", seats: 1, voteShare: "11.4%", trend: "up" },
      { party: "Others", seats: 2, voteShare: "18.8%", trend: "up" },
    ],
    demographics: [
      { label: "Rural", value: "52%" },
      { label: "Urban", value: "48%" },
      { label: "Youth (18–35)", value: "43%" },
      { label: "Women voters", value: "50%" },
    ],
    swingRegions: ["Chennai", "Coimbatore", "Madurai", "Delta districts"],
    districtHighlights: [{ district: "Chennai", note: "Urban welfare politics central" }],
    analysis: {
      summary: "Tamil Nadu politics is alliance-centric with welfare scheme competition and strong regional identity.",
      strengths: ["Stable turnout", "Issue-based voting", "High digital adoption in cities"],
      risks: ["Alliance arithmetic complexity", "Urban protest sensitivity"],
      recommendation: "Delta + Chennai digital campaigns; Tamil-first creative assets.",
    },
    news: [],
  },
  {
    code: "KA",
    name: "Karnataka",
    capital: "Bengaluru",
    region: "South",
    totalSeats: 28,
    assemblySeats: 224,
    phases: 2,
    electorate: "5.2 Cr",
    turnout: "69.8%",
    leadingParty: "INC",
    margin: "3.6%",
    status: "Tech-urban mix",
    partyBreakdown: [
      { party: "INC", seats: 12, voteShare: "35.2%", trend: "up" },
      { party: "BJP", seats: 11, voteShare: "34.8%", trend: "stable" },
      { party: "JD(S)", seats: 2, voteShare: "12.1%", trend: "down" },
      { party: "Others", seats: 3, voteShare: "17.9%", trend: "stable" },
    ],
    demographics: [
      { label: "Rural", value: "61%" },
      { label: "Urban", value: "39%" },
      { label: "Youth (18–35)", value: "45%" },
      { label: "Women voters", value: "49%" },
    ],
    swingRegions: ["Bengaluru Urban", "Mysuru", "Hyderabad-Karnataka", "Coastal Karnataka"],
    districtHighlights: [{ district: "Bengaluru", note: "Startup workforce voter segment" }],
    analysis: {
      summary: "Karnataka mixes Bengaluru's cosmopolitan voters with Old Mysore and Hyderabad-Karnataka dynamics.",
      strengths: ["High information voters", "Strong digital analytics", "Bilingual outreach possible"],
      risks: ["Urban apathy risk", "Lingering regional identity issues"],
      recommendation: "Bengaluru tech-town halls + Old Mysore rural yatras in parallel.",
    },
    news: [],
  },
  {
    code: "GJ",
    name: "Gujarat",
    capital: "Gandhinagar",
    region: "West",
    totalSeats: 26,
    assemblySeats: 182,
    phases: 1,
    electorate: "4.6 Cr",
    turnout: "64.3%",
    leadingParty: "BJP",
    margin: "9.8%",
    status: "Incumbent stronghold",
    partyBreakdown: [
      { party: "BJP", seats: 19, voteShare: "52.1%", trend: "stable" },
      { party: "INC", seats: 5, voteShare: "28.4%", trend: "down" },
      { party: "Others", seats: 2, voteShare: "19.5%", trend: "up" },
    ],
    demographics: [
      { label: "Rural", value: "57%" },
      { label: "Urban", value: "43%" },
      { label: "Youth (18–35)", value: "39%" },
      { label: "Women voters", value: "48%" },
    ],
    swingRegions: ["Saurashtra", "Central Gujarat", "South Gujarat"],
    districtHighlights: [{ district: "Ahmedabad", note: "Business community influence" }],
    analysis: {
      summary: "Gujarat favors stable governance narratives. Urban business voters and Saurashtra agrarian blocks differ.",
      strengths: ["Organized cadre", "Business network funding", "Low violence history"],
      risks: ["Complacency in strongholds", "Patidar/youth job issues in pockets"],
      recommendation: "South Gujarat outreach + urban youth employment messaging.",
    },
    news: [],
  },
];

function parsePercent(str) {
  const n = parseFloat(String(str || "").replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

function enrichState(st) {
  const partyBreakdown = (st.partyBreakdown || []).map((p) => ({
    ...p,
    voteShareNum: parsePercent(p.voteShare),
  }));
  const seatsHeld = partyBreakdown.reduce((sum, p) => sum + (p.seats || 0), 0);
  const constituencyWatch = (st.districtHighlights || []).map((d, i) => ({
    constituency: d.district,
    zone: st.swingRegions?.[i % (st.swingRegions?.length || 1)] || st.region,
    note: d.note,
    priority: i === 0 ? "Critical" : i === 1 ? "High" : "Watch",
    margin: `${(1.8 + i * 1.1).toFixed(1)}%`,
    leading: st.leadingParty,
  }));
  const phaseSchedule = Array.from({ length: st.phases || 1 }, (_, i) => ({
    phase: i + 1,
    seats: Math.ceil(st.totalSeats / (st.phases || 1)),
    window: `Phase ${i + 1}`,
    status: i === 0 ? "Completed" : i === 1 ? "Active" : "Scheduled",
  }));
  return {
    ...st,
    partyBreakdown,
    seatMath: {
      lokSabha: st.totalSeats,
      allocated: seatsHeld,
      swing: Math.max(0, st.totalSeats - seatsHeld),
    },
    keyMetrics: [
      { label: "Lok Sabha seats", value: String(st.totalSeats) },
      { label: "Assembly seats", value: String(st.assemblySeats) },
      { label: "Electorate", value: st.electorate },
      { label: "Polling phases", value: String(st.phases) },
      { label: "Turnout (2024 est.)", value: st.turnout },
      { label: "Victory margin", value: st.margin },
    ],
    constituencyWatch,
    phaseSchedule,
    swingRegionDetails: (st.swingRegions || []).map((r) => ({
      region: r,
      seats: Math.max(2, Math.round(st.totalSeats / (st.swingRegions?.length || 4))),
      competitiveness:
        parsePercent(st.margin) < 4 ? "High" : parsePercent(st.margin) < 7 ? "Medium" : "Low",
    })),
  };
}

function getStateByCode(code) {
  const upper = String(code || "").toUpperCase();
  const st = ELECTION_STATES.find((s) => s.code === upper) || null;
  return st ? enrichState(st) : null;
}

function getElectionSummary() {
  const base = {
    totalStates: ELECTION_STATES.length,
    totalLokSabhaSeats: ELECTION_STATES.reduce((s, st) => s + st.totalSeats, 0),
    avgTurnout: "67.4%",
    competitiveStates: ELECTION_STATES.filter((s) => parsePercent(s.margin) < 5).length,
    states: ELECTION_STATES.map((s) => ({
      code: s.code,
      name: s.name,
      region: s.region,
      totalSeats: s.totalSeats,
      assemblySeats: s.assemblySeats,
      turnout: s.turnout,
      leadingParty: s.leadingParty,
      margin: s.margin,
      status: s.status,
      electorate: s.electorate,
      phases: s.phases,
    })),
    comparison: ELECTION_STATES.map((s) => ({
      code: s.code,
      name: s.name,
      region: s.region,
      seats: s.totalSeats,
      turnout: s.turnout,
      leadingParty: s.leadingParty,
      margin: s.margin,
      status: s.status,
    })),
  };
  return base;
}

module.exports = { ELECTION_STATES, getElectionSummary, getStateByCode, enrichState };
