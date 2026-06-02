const express = require("express");
const { Candidate, toPublicCandidate } = require("../models/Candidate");
const { App } = require("../models/App");
const { getStateByCode } = require("../data/electionStates");

const router = express.Router();

async function getCandidate(req) {
  return Candidate.findById(req.user.sub);
}

function constituencyStateHint(constituency) {
  const c = (constituency || "").toLowerCase();
  if (c.includes("lucknow") || c.includes("varanasi") || c.includes("noida") || c.includes("gorakhpur")) return "UP";
  if (c.includes("patna") || c.includes("gaya") || c.includes("bihar")) return "BR";
  if (c.includes("mumbai") || c.includes("pune") || c.includes("nagpur")) return "MH";
  return "UP";
}

router.get("/overview", async (req, res) => {
  const candidate = await getCandidate(req);
  if (!candidate || !candidate.isActive) return res.status(404).json({ error: "NOT_FOUND" });

  const stateCode = constituencyStateHint(candidate.constituency);
  const state = getStateByCode(stateCode);

  return res.json({
    candidate: toPublicCandidate(candidate),
    metrics: {
      constituencyRank: 3,
      boothCoverage: "78%",
      digitalReach: "124K",
      sentimentScore: 72,
      campaignDaysLeft: 42,
      stateCode,
      stateName: state?.name || "Uttar Pradesh",
    },
  });
});

router.get("/profile", async (req, res) => {
  const candidate = await getCandidate(req);
  if (!candidate) return res.status(404).json({ error: "NOT_FOUND" });
  const app = await App.findById(candidate.appId).select("businessName");
  return res.json({
    candidate: toPublicCandidate(candidate),
    appName: app?.businessName || "MagnifAI",
  });
});

router.get("/sections/:section", async (req, res) => {
  const candidate = await getCandidate(req);
  if (!candidate) return res.status(404).json({ error: "NOT_FOUND" });

  const section = req.params.section;
  const stateCode = constituencyStateHint(candidate.constituency);
  const state = getStateByCode(stateCode);

  const base = {
    section,
    candidate: {
      name: candidate.name,
      partyName: candidate.partyName,
      constituency: candidate.constituency,
      assembly: candidate.assembly,
    },
    state: state
      ? { code: state.code, name: state.name, leadingParty: state.leadingParty, turnout: state.turnout }
      : null,
  };

  const sectionData = {
    analysis: {
      summary: `Constituency analytics for ${candidate.name} in ${candidate.constituency}.`,
      scorecard: [
        { label: "Visibility index", value: "74/100" },
        { label: "Issue alignment", value: "68%" },
        { label: "Opposition pressure", value: "Medium" },
      ],
      insights: state?.analysis?.summary || "Constituency-level sentiment tracking active.",
    },
    technology: {
      summary: "Digital war-room and booth tech stack overview.",
      tools: [
        { name: "Voter CRM", status: "Active", usage: "92%" },
        { name: "WhatsApp Broadcast", status: "Active", usage: "88%" },
        { name: "IVR Outreach", status: "Pilot", usage: "34%" },
      ],
    },
    content: {
      summary: "Content pipeline for rallies, social, and local language assets.",
      items: [
        { type: "Short video", count: 24, status: "Published" },
        { type: "Posters", count: 18, status: "In design" },
        { type: "Speeches", count: 6, status: "Draft" },
      ],
    },
    distribution: {
      summary: "Ground distribution and volunteer network.",
      channels: [
        { channel: "Booth workers", reach: "1,240" },
        { channel: "Local influencers", reach: "86" },
        { channel: "Print regional", reach: "12 districts" },
      ],
    },
    ads: {
      summary: "Paid media allocation across digital and print.",
      campaigns: [
        { platform: "Meta", spend: "₹4.2L", roas: "3.1x" },
        { platform: "YouTube", spend: "₹2.8L", roas: "2.4x" },
        { platform: "Local cable", spend: "₹1.5L", roas: "N/A" },
      ],
    },
    operation: {
      summary: "Field operations and rally logistics.",
      tasks: [
        { task: "Booth committee formation", progress: 85 },
        { task: "Vehicle logistics", progress: 70 },
        { task: "Volunteer training", progress: 62 },
      ],
    },
    consistency: {
      summary: "Message discipline and brand consistency score.",
      score: 81,
      checks: [
        { item: "Logo usage on creatives", pass: true },
        { item: "Manifesto talking points", pass: true },
        { item: "Regional language variants", pass: false },
      ],
    },
    demography: {
      summary: "Voter demographic breakdown for your constituency cluster.",
      blocks: state?.demographics || [],
      swingRegions: state?.swingRegions || [],
    },
    "demography-election": {
      summary: "State electoral outlook — Lok Sabha arithmetic, PI targets, and field priorities.",
      popularityIndex: {
        current: 58,
        target: 65,
        competitiveThreshold: 45,
        interpretation: "Competitive — intensify content and ad spend in swing segments.",
        clusters: [
          { label: "Digital Reach", value: 62, weight: "25%" },
          { label: "Sentiment", value: 72, weight: "25%" },
          { label: "Engagement Depth", value: 54, weight: "20%" },
          { label: "Ground–Digital Alignment", value: 51, weight: "15%" },
          { label: "Competitor Gap", value: 49, weight: "15%" },
        ],
      },
      wardHeatmap: [
        { ward: "Core urban belt", status: "Green", pi: 68, action: "Maintenance mode" },
        { ward: "Rural east block", status: "Yellow", pi: 52, action: "Intensify local issue content" },
        { ward: "Opposition stronghold", status: "Red", pi: 41, action: "Emergency intervention + booth push" },
      ],
      campaignPhases: [
        { phase: "Launch", timeline: "90–60 days out", budget: "20%", goal: "Awareness & name recall" },
        { phase: "Build", timeline: "60–30 days out", budget: "35%", goal: "Issue credibility" },
        { phase: "Surge", timeline: "30–10 days out", budget: "30%", goal: "Momentum & conversion" },
        { phase: "GOTV", timeline: "10 days – poll day", budget: "15%", goal: "Turnout mobilisation" },
      ],
      state: state
        ? {
            code: state.code,
            name: state.name,
            capital: state.capital,
            phases: state.phases,
            totalSeats: state.totalSeats,
            turnout: state.turnout,
            leadingParty: state.leadingParty,
            margin: state.margin,
            status: state.status,
            partyBreakdown: state.partyBreakdown,
            swingRegions: state.swingRegions,
            constituencyWatch: state.constituencyWatch,
            analysis: state.analysis,
            phaseSchedule: state.phaseSchedule,
          }
        : null,
    },
    "demography-news": {
      summary: "Latest election news relevant to your region.",
      articles: state?.news || [],
    },
    "demography-news-analysis": {
      summary: "News impact metrics and narrative tracking.",
      narratives: [
        { topic: "Alliance shifts", sentiment: "Neutral", impact: "Medium" },
        { topic: "Local development", sentiment: "Positive", impact: "High" },
        { topic: "Opposition allegations", sentiment: "Negative", impact: "Medium" },
      ],
      recommendation: state?.analysis?.recommendation || "Monitor daily news cycle; push counter-narrative within 6 hours.",
    },
  };

  return res.json({
    ...base,
    data: sectionData[section] || { summary: "Section data not available." },
  });
});

module.exports = { candidatePortalRouter: router };
