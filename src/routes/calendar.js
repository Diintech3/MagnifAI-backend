const express = require("express");
const {
  getTodayPlans,
  listPlans,
  createPlan,
  togglePlanCompletion,
  checkTimeConflicts,
  autoCompletePastPlans,
  createPlanFromMeeting
} = require("../services/calendarService");

const rootAgentRouter = express.Router();

/**
 * 1. Get Today's Plans
 * GET /api/root-agent/plans/today
 */
rootAgentRouter.get("/plans/today", async (req, res) => {
  try {
    const data = await getTodayPlans();
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
    const data = await listPlans(filter);
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
    const data = await createPlan(req.body);
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
    const data = await togglePlanCompletion(plan_id);
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
    const data = await checkTimeConflicts(plan_date, plan_time, exclude_plan_id);
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
    const data = await autoCompletePastPlans();
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
    const data = await createPlanFromMeeting(req.body);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "CREATE_FROM_MEETING_ERROR", message: err.message });
  }
});

module.exports = { rootAgentRouter };
