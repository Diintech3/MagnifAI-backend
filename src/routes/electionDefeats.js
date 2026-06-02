const express = require("express");
const { getDefeatedAnalytics, getSeatDefeatDetail } = require("../services/upElectionLosersService");

const router = express.Router();

router.get("/:stateCode", (req, res) => {
  try {
    const data = getDefeatedAnalytics(req.params.stateCode, {
      bodyType: req.query.bodyType || "VIDHAN_SABHA",
      year: req.query.year,
      search: req.query.search,
      party: req.query.party,
      rankMode: req.query.rankMode || "all",
      page: req.query.page,
      limit: req.query.limit,
    });
    // Return 200 with a descriptive payload to avoid UI breaking on 404
    // (e.g., mismatched year/bodyType in query params).
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[election-defeats]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.get("/:stateCode/seat/:seatNo", (req, res) => {
  try {
    const data = getSeatDefeatDetail(req.params.stateCode, {
      bodyType: req.query.bodyType || "VIDHAN_SABHA",
      year: req.query.year,
      seatNo: req.params.seatNo,
      candidate: req.query.candidate,
    });
    return res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[election-defeats-seat]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = { electionDefeatsRouter: router };
