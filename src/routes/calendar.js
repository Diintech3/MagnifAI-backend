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
  runDailyPlanAnalysis,
  editPlan,
  askRootAgentChat,
  getRootAgentSessions,
  getRootAgentHistory,
  deleteRootAgentSession
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

/**
 * 12. Edit Daily Plan
 * PUT /api/root-agent/plans/:plan_id
 */
rootAgentRouter.put("/plans/:plan_id", async (req, res) => {
  try {
    const { plan_id } = req.params;
    const token = await getContextToken(req);
    const data = await editPlan(plan_id, req.body, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "EDIT_PLAN_ERROR", message: err.message });
  }
});

/**
 * 13. Root Agent Chat - Send conversation message
 * POST /api/root-agent/chat
 */
rootAgentRouter.post("/chat", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await askRootAgentChat(req.body, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ROOT_CHAT_ERROR", message: err.message });
  }
});

/**
 * 14. Root Agent Chat - Get Sessions List
 * GET /api/root-agent/sessions
 */
rootAgentRouter.get("/sessions", async (req, res) => {
  try {
    const token = await getContextToken(req);
    const data = await getRootAgentSessions(token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ROOT_SESSIONS_ERROR", message: err.message });
  }
});

/**
 * 15. Root Agent Chat - Retrieve Session History
 * GET /api/root-agent/history
 */
rootAgentRouter.get("/history", async (req, res) => {
  try {
    const { session_id } = req.query;
    const token = await getContextToken(req);
    const data = await getRootAgentHistory(session_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ROOT_HISTORY_ERROR", message: err.message });
  }
});

/**
 * 16. Root Agent Chat - Delete Session
 * DELETE /api/root-agent/sessions/:session_id
 */
rootAgentRouter.delete("/sessions/:session_id", async (req, res) => {
  try {
    const { session_id } = req.params;
    const token = await getContextToken(req);
    const data = await deleteRootAgentSession(session_id, token);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "ROOT_DELETE_SESSION_ERROR", message: err.message });
  }
});

async function getPingStatsHandler(req, res) {
  try {
    const { env } = require("../config/env");
    
    // 1. Resolve authentication (JWT or X-App-Token)
    let token = req.headers["x-app-token"];
    let ceo = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { verifyAccessToken } = require("../utils/jwt");
        const jwtToken = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(jwtToken);
        req.user = decoded;
      } catch (err) {
        // Ignore JWT errors and fall back to X-App-Token validation
      }
    }

    const { CEO } = require("../models/CEO");

    if (req.user) {
      if (req.user.role === "CEO") {
        ceo = await CEO.findById(req.user.sub);
      } else if (req.user.role === "APP") {
        ceo = await CEO.findOne({ appId: req.user.sub });
      } else {
        ceo = await CEO.findOne({});
      }
      if (ceo && ceo.ragToken) {
        token = ceo.ragToken;
      }
    }

    if (!ceo && token) {
      ceo = await CEO.findOne({ ragToken: token });
    }

    if (!token) {
      token = env.UGC_AI_APP_TOKEN;
    }

    // Validate token
    if (!ceo && token !== env.UGC_AI_APP_TOKEN) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid credentials or missing X-App-Token" });
    }

    // 2. Parse Query parameters
    const { period, start_date, end_date } = req.query;

    // 3. Date limits calculation
    const now = new Date();
    let currentStart = null, currentEnd = null, previousStart = null, previousEnd = null, suffix = "vs Previous";

    if (start_date || end_date) {
      currentStart = start_date ? new Date(start_date + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      currentEnd = end_date ? new Date(end_date + "T23:59:59.999") : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const diffMs = currentEnd - currentStart;
      previousStart = new Date(currentStart.getTime() - diffMs - 1);
      previousEnd = new Date(currentStart.getTime() - 1);
      suffix = "vs Previous Period";
    } else {
      const p = (period || "today").toLowerCase();
      if (p === "today") {
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
        suffix = "vs Yesterday";
      } else if (p === "yesterday") {
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
        suffix = "vs Day Before";
      } else if (p === "this_week") {
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const diffMs = currentEnd - currentStart;
        previousStart = new Date(currentStart.getTime() - diffMs - 1);
        previousEnd = new Date(currentStart.getTime() - 1);
        suffix = "vs Previous Week";
      } else {
        // "all" preset - no date filters
        currentStart = null;
        currentEnd = null;
        previousStart = null;
        previousEnd = null;
        suffix = "vs Previous";
      }
    }

    // 4. Fetch Agents
    const { listAgents, getVisitorSessions, getSessionHistory } = require("../services/agentAiService");
    const rawAgentsList = await listAgents(token);
    const agentsList = Array.isArray(rawAgentsList) ? rawAgentsList : [];

    // 5. Gather all sessions and aggregate
    let allCurrentSessions = [];
    let allPreviousSessions = [];

    const agentVisitorsMap = {};
    for (const agent of agentsList) {
      agentVisitorsMap[agent.agent_id] = 0;
      let agentSessions = [];
      try {
        const rawSessions = await getVisitorSessions(agent.agent_id, token);
        agentSessions = Array.isArray(rawSessions) ? rawSessions : [];
      } catch (err) {
        console.error(`[ping-stats-sessions-error] Agent: ${agent.agent_id}`, err.message);
      }

      // Filter current sessions
      const current = agentSessions.filter(sess => {
        if (!currentStart && !currentEnd) return true;
        const t = new Date(sess.created_at || sess.updated_at || 0);
        if (currentStart && t < currentStart) return false;
        if (currentEnd && t > currentEnd) return false;
        return true;
      });
      agentVisitorsMap[agent.agent_id] = current.length;
      allCurrentSessions.push(...current);

      // Filter previous sessions
      if (previousStart || previousEnd) {
        const previous = agentSessions.filter(sess => {
          const t = new Date(sess.created_at || sess.updated_at || 0);
          if (previousStart && t < previousStart) return false;
          if (previousEnd && t > previousEnd) return false;
          return true;
        });
        allPreviousSessions.push(...previous);
      }
    }

    // Classifiers
    function classifySource(sess) {
      const sessId = (sess.session_id || "").toLowerCase();
      const devName = (sess.device_name || "").toLowerCase();
      const plat = (sess.platform || "").toLowerCase();
      const role = (sess.role || "").toLowerCase();

      if (sessId.startsWith("wa_") || devName === "whatsapp client" || plat === "whatsapp" || role === "whatsapp") {
        return "whatsapp";
      } else if (sessId.startsWith("call_") || devName.includes("call") || plat === "webcall" || plat === "web_call" || role === "webcall" || role === "web_call") {
        return "calls";
      } else if (sessId.startsWith("widget_") || devName.includes("widget") || plat === "widget" || role === "widget") {
        return "widgets";
      } else {
        return "chats";
      }
    }

    function classifyOutcome(sess) {
      const analysisCat = (sess.analysis?.category || "").toLowerCase();
      const status = (sess.status || "").toLowerCase();
      
      if (analysisCat === "meeting" || status === "meeting_request") {
        return "meetings";
      } else if (["marketing", "investing", "enquiry", "lead", "inquiry"].includes(analysisCat) || ["enquiry", "lead", "inquiry"].includes(status)) {
        return "enquiry";
      } else if (analysisCat === "support" || status === "support") {
        return "support";
      } else if (analysisCat === "feedback" || status === "feedback") {
        return "feedback";
      } else {
        return "others";
      }
    }

    // Aggregate Current period metrics
    const currentSources = { whatsapp: 0, chats: 0, calls: 0, widgets: 0 };
    const currentOutcomes = { meetings: 0, enquiry: 0, support: 0, feedback: 0, others: 0 };

    allCurrentSessions.forEach(s => {
      if (s) {
        currentSources[classifySource(s)]++;
        currentOutcomes[classifyOutcome(s)]++;
      }
    });

    // Aggregate Previous period metrics
    const previousSources = { whatsapp: 0, chats: 0, calls: 0, widgets: 0 };
    const previousOutcomes = { meetings: 0, enquiry: 0, support: 0, feedback: 0, others: 0 };

    allPreviousSessions.forEach(s => {
      if (s) {
        previousSources[classifySource(s)]++;
        previousOutcomes[classifyOutcome(s)]++;
      }
    });

    // Fetch message histories to calculate total pings (messages)
    async function getMessagesCount(sessionsList) {
      let count = 0;
      const batchSize = 15;
      for (let i = 0; i < sessionsList.length; i += batchSize) {
        const batch = sessionsList.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(s => getSessionHistory(s.session_id, token).then(hist => (Array.isArray(hist) ? hist.length : 0)).catch(() => 0))
        );
        count += results.reduce((a, b) => a + b, 0);
      }
      return count;
    }

    const currentPings = await getMessagesCount(allCurrentSessions);
    const previousPings = await getMessagesCount(allPreviousSessions);

    // Compute Growth helper
    function getGrowthMetrics(curr, prev, isOutcomeOrSource = false) {
      if (prev === 0) {
        if (curr === 0) {
          return {
            count: curr,
            growth: isOutcomeOrSource ? "0%" : "0%",
            growth_text: isOutcomeOrSource ? "" : `0% ${suffix}`,
            is_positive: true
          };
        }
        return {
          count: curr,
          growth: isOutcomeOrSource ? "100% ↑" : "↑ 100%",
          growth_text: isOutcomeOrSource ? "" : `↑ 100% ${suffix}`,
          is_positive: true
        };
      }
      const pct = Math.round(((curr - prev) / prev) * 100);
      const sign = pct >= 0 ? "↑" : "↓";
      const absPct = Math.abs(pct);
      return {
        count: curr,
        growth: isOutcomeOrSource ? `${absPct}% ${sign}` : `${sign} ${absPct}%`,
        growth_text: isOutcomeOrSource ? "" : `${sign} ${absPct}% ${suffix}`,
        is_positive: pct >= 0
      };
    }

    const resAgents = agentsList.map(ag => ({
      agent_id: ag.agent_id,
      name: ag.name,
      category: ag.category,
      is_active: ag.is_active,
      is_root: ag.category === "root_assistant" || ag.is_root || false,
      total_visitors: agentVisitorsMap[ag.agent_id] || 0
    }));

    return res.json({
      total_pings: getGrowthMetrics(currentPings, previousPings, false),
      conversations: getGrowthMetrics(allCurrentSessions.length, allPreviousSessions.length, false),
      sources: {
        whatsapp: getGrowthMetrics(currentSources.whatsapp, previousSources.whatsapp, true),
        chats: getGrowthMetrics(currentSources.chats, previousSources.chats, true),
        calls: getGrowthMetrics(currentSources.calls, previousSources.calls, true),
        widgets: getGrowthMetrics(currentSources.widgets, previousSources.widgets, true)
      },
      outcomes: {
        meetings: getGrowthMetrics(currentOutcomes.meetings, previousOutcomes.meetings, true),
        enquiry: getGrowthMetrics(currentOutcomes.enquiry, previousOutcomes.enquiry, true),
        support: getGrowthMetrics(currentOutcomes.support, previousOutcomes.support, true),
        feedback: getGrowthMetrics(currentOutcomes.feedback, previousOutcomes.feedback, true),
        others: getGrowthMetrics(currentOutcomes.others, previousOutcomes.others, true)
      },
      agents: resAgents
    });

  } catch (err) {
    console.error("[root-agent-pings-stats-error]", err.message);
    return res.status(500).json({ error: "PING_STATS_ERROR", message: err.message });
  }
}

module.exports = { rootAgentRouter, getPingStatsHandler };
