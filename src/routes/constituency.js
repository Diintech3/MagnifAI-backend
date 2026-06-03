const express = require("express");
const { getConstituencyDetail } = require("../services/constituencyDetailService");

const router = express.Router();

// GET /api/admin/constituency/UP/seat/:seatNo?bodyType=VIDHAN_SABHA&year=2022
router.get("/:stateCode/seat/:seatNo", (req, res) => {
  try {
    const data = getConstituencyDetail(req.params.stateCode, {
      bodyType: req.query.bodyType || "VIDHAN_SABHA",
      year: req.query.year || "2022",
      seatNo: req.params.seatNo,
    });
    if (!data.supported) return res.status(404).json(data);
    return res.json(data);
  } catch (err) {
    console.error("[constituency-detail]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = { constituencyRouter: router };
