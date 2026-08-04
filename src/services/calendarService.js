const axios = require("axios");
const { env } = require("../config/env");

function getCleanErrorMessage(err) {
  if (!err) return "";
  let details = "";
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === "string") {
      if (data.includes("<html") || data.includes("<!DOCTYPE")) {
        const payloadMatch = data.match(/data-payload="([^"]+)"/);
        if (payloadMatch) {
          try {
            const decoded = JSON.parse(Buffer.from(payloadMatch[1], "base64").toString("utf-8"));
            details = ` (${decoded.message || decoded.title})`;
          } catch (e) {
            // ignore
          }
        }
      } else {
        details = ` (${data})`;
      }
    } else if (data.message || data.error) {
      details = ` (${data.message || data.error})`;
    } else if (data.detail) {
      details = ` (${data.detail})`;
    }
  }
  return `${err.message}${details}`;
}

function getRequestConfig(overrideToken) {
  if (!env.UGC_AI_BASE_URL || !env.UGC_AI_APP_TOKEN) {
    throw new Error("3rdAI configuration (URL/Token) is missing");
  }
  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = overrideToken || env.UGC_AI_APP_TOKEN;
  return { baseUrl, token };
}

/**
 * 1. Get Today's Plans
 */
async function getTodayPlans(overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.get(`${baseUrl}/api/root-agent/plans/today`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-today-plans-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 2. List All Plans (With Filtering)
 */
async function listPlans(filter, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const qStr = filter ? `?filter=${encodeURIComponent(filter)}` : "";
    const res = await axios.get(`${baseUrl}/api/root-agent/plans${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-list-plans-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 3. Create Daily Plan
 */
async function createPlan(planData, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/root-agent/plans`, planData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-create-plan-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 4. Toggle Plan Completion
 */
async function togglePlanCompletion(planId, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.patch(`${baseUrl}/api/root-agent/plans/${planId}/complete`, {}, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-toggle-plan-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 5. Check Time Conflicts
 */
async function checkTimeConflicts(planDate, planTime, excludePlanId, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const query = [];
    if (planDate) query.push(`plan_date=${encodeURIComponent(planDate)}`);
    if (planTime) query.push(`plan_time=${encodeURIComponent(planTime)}`);
    if (excludePlanId) query.push(`exclude_plan_id=${encodeURIComponent(excludePlanId)}`);
    const qStr = query.length ? `?${query.join("&")}` : "";

    const res = await axios.get(`${baseUrl}/api/root-agent/plans/check-conflict${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-conflict-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 6. Auto-Complete Past Plans
 */
async function autoCompletePastPlans(overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/root-agent/plans/auto-complete`, {}, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-auto-complete-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 7. Create Plan from Meeting (RAG Trigger)
 */
async function createPlanFromMeeting(meetingData, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/root-agent/plans/from-meeting`, meetingData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-from-meeting-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 8. Book Meeting via Sub-Agent (With AI analysis & Auto-Planner Sync)
 */
async function bookMeetingViaSubAgent(agentId, bookingData, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/agents/${agentId}/book-meeting`, bookingData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-subagent-booking-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 9. Get Booked Dates & Planner Slots
 */
async function getBookedDates(agentId, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.get(`${baseUrl}/api/agents/${agentId}/booked-dates`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-booked-dates-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * Helper to calculate and inject allocation status if missing or invalid
 */
function enrichAnalysisResponse(data) {
  if (data && data.pace_json && data.pace_json.allocation) {
    const allocation = data.pace_json.allocation;
    if (!allocation.status || !["Good", "Fair", "Poor"].includes(allocation.status)) {
      let openPct = 0;
      if (Array.isArray(allocation.categories)) {
        const openCat = allocation.categories.find(c => 
          c.name && (c.name.toLowerCase().includes("open") || c.name.toLowerCase().includes("unscheduled"))
        );
        if (openCat) {
          openPct = parseFloat(openCat.percentage) || 0;
        }
      }
      const scheduledPct = 100 - openPct;
      if (scheduledPct >= 70) {
        allocation.status = "Good";
      } else if (scheduledPct >= 40) {
        allocation.status = "Fair";
      } else {
        allocation.status = "Poor";
      }
    }
  }
  return data;
}

/**
 * 10. Get Daily Plan AI Analysis
 */
async function getDailyPlanAnalysis(planDate, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const qStr = planDate ? `?plan_date=${encodeURIComponent(planDate)}` : "";
    const res = await axios.get(`${baseUrl}/api/root-agent/plans/analyze${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return enrichAnalysisResponse(res.data);
  } catch (err) {
    console.error("[calendar-get-analysis-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 11. Run Daily Plan AI Analysis
 */
async function runDailyPlanAnalysis(planDate, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/root-agent/plans/analyze`, { plan_date: planDate }, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return enrichAnalysisResponse(res.data);
  } catch (err) {
    console.error("[calendar-run-analysis-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 12. Edit Daily Plan
 */
async function editPlan(planId, planData, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.put(`${baseUrl}/api/root-agent/plans/${planId}`, planData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-edit-plan-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 13. Root Agent Chat - Send conversation query
 */
async function askRootAgentChat(chatData, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.post(`${baseUrl}/api/root-agent/chat`, chatData, {
      headers: { "X-App-Token": token, "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-root-chat-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 14. Root Agent Chat - Fetch Sessions List
 */
async function getRootAgentSessions(overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.get(`${baseUrl}/api/root-agent/sessions`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-root-sessions-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 15. Root Agent Chat - Retrieve Session History
 */
async function getRootAgentHistory(sessionId, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const qStr = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    const res = await axios.get(`${baseUrl}/api/root-agent/history${qStr}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-root-history-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

/**
 * 16. Root Agent Chat - Delete Session
 */
async function deleteRootAgentSession(sessionId, overrideToken) {
  const { baseUrl, token } = getRequestConfig(overrideToken);
  try {
    const res = await axios.delete(`${baseUrl}/api/root-agent/sessions/${sessionId}`, {
      headers: { "X-App-Token": token }
    });
    return res.data;
  } catch (err) {
    console.error("[calendar-root-delete-session-error]", getCleanErrorMessage(err));
    throw new Error(getCleanErrorMessage(err));
  }
}

module.exports = {
  getTodayPlans,
  listPlans,
  createPlan,
  togglePlanCompletion,
  checkTimeConflicts,
  autoCompletePastPlans,
  createPlanFromMeeting,
  bookMeetingViaSubAgent,
  getBookedDates,
  getDailyPlanAnalysis,
  runDailyPlanAnalysis,
  editPlan,
  askRootAgentChat,
  getRootAgentSessions,
  getRootAgentHistory,
  deleteRootAgentSession
};

