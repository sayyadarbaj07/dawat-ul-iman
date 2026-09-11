import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  format, 
  parseISO, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays 
} from "date-fns";

export const getMonthDays = (date) => {
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  return eachDayOfInterval({ start, end });
};

export const getWeekDays = (date) => {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return eachDayOfInterval({ start, end });
};

export const parseEventDates = (event) => {
  const dateStr = event.date; // typically YYYY-MM-DD from backend
  const startTime = event.startTime || "00:00";
  const endTime = event.endTime || "01:00";

  // Create real date objects
  const start = new Date(`${dateStr}T${startTime}`);
  const end = new Date(`${dateStr}T${endTime}`);

  // Fallback if invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      start: new Date(dateStr),
      end: new Date(dateStr),
      isValid: false
    };
  }

  return { start, end, isValid: true };
};

const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

// Map backend meetings/events to unified Calendar format
export const normalizeEvents = (meetings, events) => {
  const normalized = [];
  const seenIds = new Set(); // To deduplicate by source ID

  if (Array.isArray(meetings)) {
    meetings.forEach(m => {
      const idStr = `meeting-${m._id}`;
      if (seenIds.has(idStr)) return;
      seenIds.add(idStr);

      const dates = parseEventDates({ date: m.date, startTime: m.startTime, endTime: m.endTime });
      const hasJoinUrl = isValidUrl(m.location);
      
      normalized.push({
        id: m._id,
        title: m.title,
        date: m.date,
        start: dates.start,
        end: dates.end,
        startTime: m.startTime,
        endTime: m.endTime,
        classId: m.classId,
        className: m.classId?.name || "All Classes",
        description: m.description,
        location: m.location,
        joinUrl: hasJoinUrl ? m.location : null,
        type: "meeting", // Explicitly unified meeting
        sourceType: m.type, // General, Academic, etc.
        source: m,
        isValidTime: dates.isValid
      });
    });
  }

  if (Array.isArray(events)) {
    events.forEach(e => {
      const idStr = `event-${e._id}`;
      if (seenIds.has(idStr)) return;
      seenIds.add(idStr);

      // Events might not have explicit start/endTime in original schema, default to all-day
      const dates = parseEventDates({ date: e.date, startTime: "09:00", endTime: "10:00" });
      
      // Determine unified type based on requirements:
      let unifiedType = "activity";
      if (e.type === "holiday") {
        unifiedType = "holiday";
      } else if (e.type === "meeting") {
        // Technically an event labeled as meeting (rare since there's a meeting collection)
        unifiedType = "meeting";
      }

      normalized.push({
        id: e._id,
        title: e.title,
        date: e.date,
        start: dates.start,
        end: dates.end,
        startTime: "09:00",
        endTime: "10:00",
        type: unifiedType, // Unified type for filtering
        sourceType: e.type || "event", // Original type (exam, bazm, holiday, etc.)
        description: e.description,
        source: e,
        isValidTime: false // mostly full-day
      });
    });
  }

  return normalized.sort((a, b) => a.start - b.start);
};
