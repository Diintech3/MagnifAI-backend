const express = require("express");
const { getBodyAnalytics, listElectionBodies } = require("../services/electionBodyService");

const router = express.Router();

router.get("/bodies/list", (_req, res) => {
  return res.json({ bodies: listElectionBodies() });
});

router.get("/:stateCode", async (req, res) => {
  try {
    const data = await getBodyAnalytics(req.params.stateCode, req.query.bodyType || "VIDHAN_SABHA", {
      year: req.query.year,
      search: req.query.search,
      party: req.query.party,
      party2012: req.query.party2012,
      party2017: req.query.party2017,
      party2022: req.query.party2022,
    });
    if (!data.supported) return res.status(404).json(data);
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[election-analytics]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = { electionAnalyticsRouter: router };
