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

const hijriFormatters = {
  en_full: null,
  ur_full: null,
  en_day: null,
  ur_day: null,
  en_monthYear: null,
  ur_monthYear: null
};

export const getHijriFormatter = (language, type = 'full') => {
  const isUrdu = language === "ur";
  const locale = isUrdu ? "ur-PK-u-ca-islamic" : "en-u-ca-islamic-nu-latn";
  const key = `${isUrdu ? 'ur' : 'en'}_${type}`;
  
  if (!hijriFormatters[key]) {
    let options = {};
    if (type === 'day') options = { day: "numeric" };
    else if (type === 'monthYear') options = { month: "long", year: "numeric" };
    else options = { day: "numeric", month: "long", year: "numeric" };
    
    hijriFormatters[key] = new Intl.DateTimeFormat(locale, options);
  }
  return hijriFormatters[key];
};

export const safeParseDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  
  const dateStr = dateVal.toString();
  // Safe local parsing for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
  }
  
  // Safe local parsing for YYYY-MM-DDTHH:mm or similar, just use Date
  return new Date(dateStr);
};

export const formatHijriDate = (date, language, type = 'full') => {
  if (!date) return "";
  const safeDate = date instanceof Date ? date : safeParseDate(date);
  if (isNaN(safeDate.getTime())) return "";
  
  try {
    const formatter = getHijriFormatter(language, type);
    let result = formatter.format(safeDate);
    // Ensure AH/ہجری suffix is present if it's full or monthYear (some browsers omit it)
    if (type !== 'day') {
      if (language === 'ur' && !result.includes('ہجری')) result += ' ہجری';
      else if (language !== 'ur' && !result.includes('AH')) result += ' AH';
    }
    return result;
  } catch (e) {
    return "";
  }
};

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

  // Safe parse local date for base day
  const baseDate = safeParseDate(dateStr);
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (startTime) {
    const [h, m] = startTime.split(':');
    if (h && m) start.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  }
  if (endTime) {
    const [eh, em] = endTime.split(':');
    if (eh && em) end.setHours(parseInt(eh, 10), parseInt(em, 10), 0, 0);
  }

  // Fallback if invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      start: baseDate,
      end: baseDate,
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
export const normalizeEvents = (meetings, events, exams = []) => {
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
      if (e.type === "exam") return; // Deduping mechanism: skip legacy exams

      const idStr = `event-${e._id}`;
      if (seenIds.has(idStr)) return;
      seenIds.add(idStr);

      let unifiedType = "activity";
      let finalStart, finalEnd;
      
      if (e.type === "holiday") {
        unifiedType = "holiday";
        finalStart = safeParseDate(e.startDate || e.date);
        finalEnd = safeParseDate(e.endDate || e.date);
        // Ensure holiday covers full days
        finalStart.setHours(0, 0, 0, 0);
        finalEnd.setHours(23, 59, 59, 999);
      } else {
        if (e.type === "meeting") {
          unifiedType = "meeting";
        }
        const dates = parseEventDates({ 
          date: e.date, 
          startTime: e.startTime || "09:00", 
          endTime: e.endTime || "10:00" 
        });
        finalStart = dates.start;
        finalEnd = dates.end;
      }

      normalized.push({
        id: e._id,
        title: e.title,
        date: e.date,
        start: finalStart,
        end: finalEnd,
        startTime: e.startTime || "09:00",
        endTime: e.endTime || "10:00",
        classId: e.classId,
        className: e.classId?.name || (e.classId ? "Specific Class" : "Global Event"),
        type: unifiedType, // Unified type for filtering
        sourceType: e.type || "event", // Original type (exam, bazm, holiday, etc.)
        description: e.description,
        source: e,
        isValidTime: false // mostly full-day
      });
    });
  }

  if (Array.isArray(exams)) {
    exams.forEach(e => {
      const idStr = `exam-${e._id}`;
      if (seenIds.has(idStr)) return;
      seenIds.add(idStr);

      const start = safeParseDate(e.date);
      start.setHours(9, 0, 0, 0); // Default exam start time
      const end = safeParseDate(e.date);
      end.setHours(12, 0, 0, 0); // Default exam end time

      normalized.push({
        id: e._id,
        title: e.name || e.examName || "Academic Exam",
        date: e.date,
        start,
        end,
        startTime: "09:00",
        endTime: "12:00",
        classId: e.classId,
        className: e.classId?.name || e.class || "All Classes",
        type: "exam",
        sourceType: "exam",
        description: `Academic Exam for ${e.academicYear}. Subjects: ${(e.subjects || []).join(", ")}`,
        source: e,
        isValidTime: true
      });
    });
  }

  return normalized.sort((a, b) => a.start - b.start);
};
