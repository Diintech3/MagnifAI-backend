const express = require("express");
const { App } = require("../models/App");
const { adminAppsRouter } = require("./adminApps");
const { electionRouter } = require("./election");
const { geoJsonRouter } = require("./geojson");
const { electionAnalyticsRouter } = require("./electionAnalytics");
const { electionDefeatsRouter } = require("./electionDefeats");
const { constituencyRouter } = require("./constituency");
const { socialDataRouter } = require("./socialData");

const router = express.Router();

router.get("/overview", async (req, res) => {
  const filter = req.user.role === "SUPERADMIN" ? {} : { createdBy: req.user.sub };
  const [totalApps, activeApps] = await Promise.all([
    App.countDocuments(filter),
    App.countDocuments({ ...filter, isActive: true }),
  ]);

  return res.json({
    message: "Welcome to your admin dashboard",
    totalApps,
    activeApps,
    system: {
      serverTime: new Date().toISOString(),
    },
  });
});

router.use("/apps", adminAppsRouter);
router.use("/election", electionRouter);
router.use("/geojson", geoJsonRouter);
router.use("/election-analytics", electionAnalyticsRouter);
router.use("/election-defeats", electionDefeatsRouter);
router.use("/constituency", constituencyRouter);
router.use("/social-data", socialDataRouter);

module.exports = { adminRouter: router };
