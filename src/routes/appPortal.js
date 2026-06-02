const express = require("express");
const { App } = require("../models/App");
const { Candidate } = require("../models/Candidate");
const { candidatesRouter } = require("./candidates");

const router = express.Router();

async function getAppForUser(req) {
  return App.findById(req.user.sub);
}

router.get("/overview", async (req, res) => {
  const app = await getAppForUser(req);
  if (!app) return res.status(404).json({ error: "NOT_FOUND" });

  const totalCandidates = await Candidate.countDocuments({ appId: app._id });

  return res.json({
    businessName: app.businessName,
    totalCandidates,
    agentsCount: app.agentsCount ?? 0,
    isActive: app.isActive,
  });
});

router.use("/candidates", candidatesRouter);

module.exports = { appPortalRouter: router };
