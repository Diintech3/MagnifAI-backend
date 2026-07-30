const express = require("express");
const {
  getTodayPlans,
  listPlans,
  createPlan,
  togglePlanCompletion,
  checkTimeConflicts,
  autoCompletePastPlans,
  createPlanFromMeeting,
  getDailyPlanAnalysis,
  runDailyPlanAnalysis
} = require("../services/calendarService");

const rootAgentRouter = express.Router();

// Helper to get CEO's specific RAG Token from DB based on request context
async function getContextToken(req) {
  if (req && req.user && req.user.role === "CEO") {
    try {
      const { CEO } = require("../models/CEO");
      const ceo = await CEO.findById(req.user.sub);
      if (ceo && ceo.ragToken) {
        return ceo.ragToken;
      }
    } catch (err) {
      console.error("[getContextToken-error]", err.message);
    }
  }
  return undefined;
}

/**
 * 1. Get Today's Plans
 * GET /api/root-agent/plans/today
 */
rootAgentRouter.get("/plans/today", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await getTodayPlans(token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_TODAY_PLANS_ERROR", message: err.message });
  }
});

/**
 * 2. List All Plans (With Filtering)
 * GET /api/root-agent/plans
 */
rootAgentRouter.get("/plans", async (req, res) => {
  try {
    const { filter } = req.query;
    const token = await getContextToken(req);
    const data = await listPlans(filter, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "LIST_PLANS_ERROR", message: err.message });
  }
});

/**
 * 3. Create Daily Plan
 * POST /api/root-agent/plans
 */
rootAgentRouter.post("/plans", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await createPlan(req.body, token);
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: "CREATE_PLAN_ERROR", message: err.message });
  }
});

/**
 * 4. Toggle Plan Completion
 * PATCH /api/root-agent/plans/:plan_id/complete
 */
rootAgentRouter.patch("/plans/:plan_id/complete", async (req, res) => {
  try {
    const { plan_id } = req.params;
    const token = await getContextToken(req);
    const data = await togglePlanCompletion(plan_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "TOGGLE_COMPLETION_ERROR", message: err.message });
  }
});

/**
 * 5. Check Time Conflicts
 * GET /api/root-agent/plans/check-conflict
 */
rootAgentRouter.get("/plans/check-conflict", async (req, res) => {
  try {
    const { plan_date, plan_time, exclude_plan_id } = req.query;
    const token = await getContextToken(req);
    const data = await checkTimeConflicts(plan_date, plan_time, exclude_plan_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "CHECK_CONFLICT_ERROR", message: err.message });
  }
});

/**
 * 6. Auto-Complete Past Plans
 * POST /api/root-agent/plans/auto-complete
 */
rootAgentRouter.post("/plans/auto-complete", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await autoCompletePastPlans(token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "AUTO_COMPLETE_ERROR", message: err.message });
  }
});

/**
 * 7. Create Plan from Meeting (RAG Trigger)
 * POST /api/root-agent/plans/from-meeting
 */
rootAgentRouter.post("/plans/from-meeting", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await createPlanFromMeeting(req.body, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "CREATE_FROM_MEETING_ERROR", message: err.message });
  }
});

/**
 * 10. Get Daily Plan AI Analysis
 * GET /api/root-agent/plans/analyze
 */
rootAgentRouter.get("/plans/analyze", async (req, res) => {
  try {
    const { plan_date } = req.query;
    if (!plan_date) {
      return res.status(400).json({ error: "PLAN_DATE_REQUIRED" });
    }
    const token = await getContextToken(req);
    const data = await getDailyPlanAnalysis(plan_date, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "GET_ANALYSIS_ERROR", message: err.message });
  }
});

/**
 * 11. Run Daily Plan AI Analysis
 * POST /api/root-agent/plans/analyze
 */
rootAgentRouter.post("/plans/analyze", async (req, res) => {
  try {
    const { plan_date } = req.body;
    if (!plan_date) {
      return res.status(400).json({ error: "PLAN_DATE_REQUIRED" });
    }
    const token = await getContextToken(req);
    const data = await runDailyPlanAnalysis(plan_date, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "RUN_ANALYSIS_ERROR", message: err.message });
  }
});

module.exports = { rootAgentRouter };
