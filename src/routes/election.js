const express = require("express");
const { getElectionSummary, getStateByCode } = require("../data/electionStates");
const { listElectionBodies } = require("../services/electionBodyService");

const router = express.Router();

router.get("/bodies", (_req, res) => {
  return res.json({ bodies: listElectionBodies() });
});

router.get("/", (_req, res) => {
  return res.json(getElectionSummary());
});

router.get("/:code", (req, res) => {
  const state = getStateByCode(req.params.code);
  if (!state) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ state });
});

module.exports = { electionRouter: router };
