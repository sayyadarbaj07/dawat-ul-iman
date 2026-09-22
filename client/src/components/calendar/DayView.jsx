import React from "react";
import { format, isSameDay } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";
import { formatHijriDate } from "./utils";

export function DayView({ currentDate, events, onEventClick }) {
  const { tr, language } = useLanguage();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 1 hour = 60px height
  const getEventStyle = (event) => {
    if (!event.isValidTime) return { display: "none" };
    const startHour = event.start.getHours();
    const startMin = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMin = event.end.getMinutes();

    const top = (startHour * 60) + startMin;
    const duration = ((endHour * 60) + endMin) - top;
    const height = Math.max(duration, 30);

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const getColors = (type) => {
    switch (type) {
      case "meeting": return "bg-primary/90 text-white hover:bg-primary border-primary";
      case "exam": return "bg-amber-400 text-amber-900 hover:bg-amber-500 border-amber-500";
      case "holiday": return "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600";
      default: return "bg-blue-500 text-white hover:bg-blue-600 border-blue-600";
    }
  };

  const dayEvents = events.filter(e => isSameDay(e.start, currentDate) && e.isValidTime);
  const allDayEvents = events.filter(e => isSameDay(e.start, currentDate) && !e.isValidTime);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-border/60 bg-muted/10 p-4 items-center gap-4">
        <div className="text-4xl font-black text-foreground">{format(currentDate, "d")}</div>
        <div className="flex flex-col">
          <div className="text-sm font-bold uppercase text-muted-foreground">
            {language === "ur" ? tr("calendar", format(currentDate, "EEEE")) : format(currentDate, "EEEE")}
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {language === "ur" 
              ? `${tr("calendar", format(currentDate, "MMMM"))} ${format(currentDate, "yyyy")}` 
              : format(currentDate, "MMMM yyyy")}
          </div>
          <div className="text-xs font-medium text-muted-foreground/80 mt-0.5">
            {formatHijriDate(currentDate, language, 'full')}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {allDayEvents.length > 0 && (
          <div className="border-b border-border/60 bg-muted/5 p-3 flex flex-wrap gap-2">
            {allDayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`text-xs font-bold px-3 py-1.5 rounded-md shadow-sm cursor-pointer ${getColors(event.type)}`}
              >
                {event.title}
              </div>
            ))}
          </div>
        )}

        <div className="flex relative" style={{ height: `${24 * 60}px` }}>
          {/* Time scale */}
          <div className="w-20 shrink-0 border-r border-border/40 bg-card relative z-10">
            {hours.map(hour => (
              <div key={hour} className="h-[60px] relative border-b border-transparent">
                <span className="absolute -top-2.5 right-3 text-xs font-medium text-muted-foreground">
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Grid column */}
          <div className="flex-1 relative">
            {/* Horizontal lines */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map(hour => (
                <div key={`line-${hour}`} className="h-[60px] border-b border-border/40 border-dashed w-full" />
              ))}
            </div>

            {/* Timed events */}
            {dayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                style={getEventStyle(event)}
                className={`absolute left-2 right-4 rounded-lg border shadow-sm p-2 overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 z-10 ${getColors(event.type)}`}
              >
                <div className="text-xs font-bold leading-tight">{event.title}</div>
                <div className="text-xs opacity-90 mt-1 font-medium flex justify-between">
                  <span>{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</span>
                  {event.className && <span>{event.className}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
