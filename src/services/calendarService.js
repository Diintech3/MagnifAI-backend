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

function getRequestConfig() {
  if (!env.UGC_AI_BASE_URL || !env.UGC_AI_APP_TOKEN) {
    throw new Error("3rdAI configuration (URL/Token) is missing");
  }
  const baseUrl = env.UGC_AI_BASE_URL.replace(/\/$/, "");
  const token = env.UGC_AI_APP_TOKEN;
  return { baseUrl, token };
}

/**
 * 1. Get Today's Plans
 */
async function getTodayPlans() {
  const { baseUrl, token } = getRequestConfig();
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
async function listPlans(filter) {
  const { baseUrl, token } = getRequestConfig();
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
async function createPlan(planData) {
  const { baseUrl, token } = getRequestConfig();
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
async function togglePlanCompletion(planId) {
  const { baseUrl, token } = getRequestConfig();
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
async function checkTimeConflicts(planDate, planTime, excludePlanId) {
  const { baseUrl, token } = getRequestConfig();
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
async function autoCompletePastPlans() {
  const { baseUrl, token } = getRequestConfig();
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
async function createPlanFromMeeting(meetingData) {
  const { baseUrl, token } = getRequestConfig();
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
async function bookMeetingViaSubAgent(agentId, bookingData) {
  const { baseUrl, token } = getRequestConfig();
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
async function getBookedDates(agentId) {
  const { baseUrl, token } = getRequestConfig();
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

module.exports = {
  getTodayPlans,
  listPlans,
  createPlan,
  togglePlanCompletion,
  checkTimeConflicts,
  autoCompletePastPlans,
  createPlanFromMeeting,
  bookMeetingViaSubAgent,
  getBookedDates
};
