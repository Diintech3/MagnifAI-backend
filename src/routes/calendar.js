const express = require("express");
const {
  getTodayPlans,
  listPlans,
  createPlan,
  togglePlanCompletion,
  checkTimeConflicts,
  autoCompletePastPlans,
  createPlanFromMeeting,
  bookMeetingViaSubAgent,
  getBookedDates
} = require("../services/calendarService");

const calendarRouter = express.Router();
const remindersRouter = express.Router();

/**
 * Helpers to format ISO datetime to Date (YYYY-MM-DD) and Time (HH:MM)
 */
function extractDateTime(isoString) {
  if (!isoString) return { dateStr: "", timeStr: "" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { dateStr: "", timeStr: "" };
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`
  };
}

/**
 * Helper to map external plans schema back to mobile Calendar Event Entity
 */
function mapToMobileEvent(plan) {
  if (!plan) return null;
  const planDate = plan.plan_date || "2026-07-24";
  const planTime = plan.plan_time || "09:00";
  
  const startIso = `${planDate}T${planTime}:00Z`;
  
  // Estimate end time (add 30 minutes)
  const [hh, mm] = planTime.split(":").map(Number);
  const endMin = (mm + 30) % 60;
  const endHr = hh + Math.floor((mm + 30) / 60);
  const endTimeStr = `${String(endHr).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  const endIso = `${planDate}T${endTimeStr}:00Z`;

  // Color mapping based on category
  let color = "#EDFDF5";
  let border_color = "#BBF7D0";
  const cat = String(plan.category || "").toLowerCase();
  
  if (cat === "meetings" || cat === "work" || cat === "meeting") {
    color = "#FEFAF2";
    border_color = "#FEF3C7";
  } else if (cat === "reminder" || cat === "health") {
    color = "#FDF2F8";
    border_color = "#FBCFE8";
  } else if (cat === "travel") {
    color = "#EFF6FF";
    border_color = "#BFDBFE";
  }

  return {
    id: plan.plan_id || `evt_${Math.random().toString(36).substring(2, 9)}`,
    title: plan.title || "No Title",
    subtitle: plan.description || "",
    description: plan.description || "",
    category: plan.category || "Tasks",
    start_time: startIso,
    end_time: endIso,
    is_completed: plan.is_completed || false,
    room_or_link: plan.from_meeting ? "Meeting Scheduled" : "",
    metadata: {
      color,
      border_color
    }
  };
}

// ── CALENDAR ROUTES ─────────────────────────────────────────────────────────

/**
 * 1. Fetch Calendar Events
 * GET /api/v1/calendar/events
 */
calendarRouter.get("/events", async (req, res) => {
  try {
    const { start_date, end_date, category, filter } = req.query;
    const rawPlans = await listPlans(filter || "all");
    
    let events = rawPlans.map(mapToMobileEvent);
    
    // Apply client-side date filters if requested
    if (start_date) {
      const startMs = new Date(start_date).getTime();
      events = events.filter(e => new Date(e.start_time).getTime() >= startMs);
    }
    if (end_date) {
      const endMs = new Date(end_date).getTime();
      events = events.filter(e => new Date(e.start_time).getTime() <= endMs);
    }
    
    // Apply client-side category filters if requested
    if (category) {
      const catLower = category.toLowerCase();
      events = events.filter(e => e.category.toLowerCase() === catLower);
    }
    
    return res.json({ success: true, events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Create Event
 * POST /api/v1/calendar/events
 */
calendarRouter.post("/events", async (req, res) => {
  try {
    const { title, subtitle, description, category, start_time, room_or_link } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: "TITLE_REQUIRED" });
    }
    
    const { dateStr, timeStr } = extractDateTime(start_time || new Date().toISOString());
    
    const payload = {
      title,
      description: description || subtitle || "Created via Calendar App",
      category: category || "Tasks",
      plan_date: dateStr,
      plan_time: timeStr
    };
    
    const result = await createPlan(payload);
    const mapped = mapToMobileEvent(result.plan || result);
    
    return res.status(201).json({ success: true, event: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Toggle Completion Status
 * PATCH /api/v1/calendar/events/:id/toggle
 */
calendarRouter.patch("/events/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await togglePlanCompletion(id);
    const updatedPlan = result.plan || result;
    return res.json({
      success: true,
      id: updatedPlan.plan_id || id,
      is_completed: updatedPlan.is_completed || false
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Fetch Calendar Carousel
 * GET /api/v1/calendar/carousel
 */
calendarRouter.get("/carousel", async (req, res) => {
  try {
    const rawPlans = await getTodayPlans();
    
    // Sort plans by time
    const sorted = rawPlans.sort((a, b) => {
      const timeA = a.plan_time || "00:00";
      const timeB = b.plan_time || "00:00";
      return timeA.localeCompare(timeB);
    });

    const carouselItems = sorted.map((p, idx) => {
      const timeParts = (p.plan_time || "09:00").split(":");
      let hr = Number(timeParts[0]);
      const ampm = hr >= 12 ? "PM" : "AM";
      hr = hr % 12 || 12;
      const formattedTime = `${String(hr).padStart(2, '0')}:${timeParts[1]} ${ampm}`;
      
      return {
        id: p.plan_id || `item_${idx}`,
        title: p.title || "Task",
        category: p.category || "General",
        time: formattedTime,
        starts_in: p.is_completed ? "Completed" : "Today",
        colors: idx % 2 === 0 ? ["#FBCFE8", "#E9D5FF"] : ["#BFDBFE", "#A7F3D0"],
        border_color: idx % 2 === 0 ? "#D8B4FE" : "#6EE7B7",
        border_animation_colors: idx % 2 === 0 ? ["#EF8BFF", "#B982FF"] : ["#10B981", "#3B82F6"]
      };
    });

    return res.json({ success: true, carousel_items: carouselItems });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Check conflicts
 * GET /api/v1/calendar/check-conflict
 */
calendarRouter.get("/check-conflict", async (req, res) => {
  try {
    const { plan_date, plan_time, exclude_plan_id } = req.query;
    if (!plan_date || !plan_time) {
      return res.status(400).json({ success: false, error: "DATE_AND_TIME_REQUIRED" });
    }
    const result = await checkTimeConflicts(plan_date, plan_time, exclude_plan_id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. Auto-Complete Past Plans
 * POST /api/v1/calendar/auto-complete
 */
calendarRouter.post("/auto-complete", async (req, res) => {
  try {
    const result = await autoCompletePastPlans();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. Create Plan from Meeting (RAG Trigger)
 * POST /api/v1/calendar/from-meeting
 */
calendarRouter.post("/from-meeting", async (req, res) => {
  try {
    const result = await createPlanFromMeeting(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. Book Meeting via Sub-Agent
 * POST /api/v1/calendar/agents/:agent_id/book-meeting
 */
calendarRouter.post("/agents/:agent_id/book-meeting", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const result = await bookMeetingViaSubAgent(agent_id, req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 9. Get Booked Dates
 * GET /api/v1/calendar/agents/:agent_id/booked-dates
 */
calendarRouter.get("/agents/:agent_id/booked-dates", async (req, res) => {
  try {
    const { agent_id } = req.params;
    const result = await getBookedDates(agent_id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ── REMINDERS ROUTES ────────────────────────────────────────────────────────

/**
 * 1. Fetch Today's Reminders Dashboard
 * GET /api/v1/reminders/today
 */
remindersRouter.get("/today", async (req, res) => {
  try {
    const rawPlans = await getTodayPlans();
    
    // Sort plans by time
    const sorted = rawPlans.sort((a, b) => {
      const timeA = a.plan_time || "00:00";
      const timeB = b.plan_time || "00:00";
      return timeA.localeCompare(timeB);
    });

    const mapped = sorted.map(mapToMobileEvent);
    
    const today_scheduled = mapped.find(e => e.category.toLowerCase() === "meetings" || e.category.toLowerCase() === "work" || e.category.toLowerCase() === "meeting") || null;
    const today_task = mapped.find(e => e.category.toLowerCase() === "tasks" || e.category.toLowerCase() === "reminder" || e.category.toLowerCase() === "health") || null;
    const today_travel = mapped.find(e => e.category.toLowerCase() === "travel") || null;

    // Filter used count
    const usedIds = new Set();
    if (today_scheduled) usedIds.add(today_scheduled.id);
    if (today_task) usedIds.add(today_task.id);
    if (today_travel) usedIds.add(today_travel.id);
    
    const more_reminders_count = mapped.filter(e => !usedIds.has(e.id)).length;

    const yyyy = new Date().getFullYear();
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const dd = String(new Date().getDate()).padStart(2, '0');

    return res.json({
      success: true,
      date: `${yyyy}-${mm}-${dd}`,
      today_scheduled: today_scheduled ? {
        id: today_scheduled.id,
        title: today_scheduled.title,
        subtitle: today_scheduled.subtitle,
        time: extractDateTime(today_scheduled.start_time).timeStr
      } : null,
      today_task: today_task ? {
        id: today_task.id,
        title: today_task.title,
        time: extractDateTime(today_task.start_time).timeStr,
        is_completed: today_task.is_completed
      } : null,
      today_travel: today_travel ? {
        id: today_travel.id,
        title: today_travel.title,
        time: extractDateTime(today_travel.start_time).timeStr
      } : null,
      more_reminders_count
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = {
  calendarRouter,
  remindersRouter
};
