import React from "react";
import { format, isSameDay } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";
import { getWeekDays, formatHijriDate } from "./utils";

export function WeekView({ currentDate, events, onEventClick, onDayClick }) {
  const { tr, language } = useLanguage();
  const days = getWeekDays(currentDate);
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
    const height = Math.max(duration, 30); // min 30px height

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

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-border/60">
        <div className="w-16 border-r border-border/40 shrink-0"></div>
        <div className="flex-1 grid grid-cols-7">
          {days.map(day => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className="py-3 text-center border-r border-border/40 hover:bg-muted/30 cursor-pointer"
                onClick={() => onDayClick(day)}
              >
                <div className="text-[11px] font-bold uppercase text-muted-foreground">
                  {language === "ur" ? tr("calendar", format(day, "EEEE")) : format(day, "EEE")}
                </div>
                <div className={`mx-auto mt-1 flex flex-col items-center justify-center rounded text-sm font-bold ${isToday ? "bg-primary text-white shadow-sm px-2 py-1" : "text-foreground"}`}>
                  <span>{format(day, "d")}</span>
                </div>
                <div className="text-[10px] mt-1 text-muted-foreground/80 font-medium">
                  {formatHijriDate(day, language, 'day')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex relative" style={{ height: `${24 * 60}px` }}>
          {/* Time scale */}
          <div className="w-16 shrink-0 border-r border-border/40 bg-card relative z-10">
            {hours.map(hour => (
              <div key={hour} className="h-[60px] relative border-b border-transparent">
                <span className="absolute -top-2.5 right-2 text-[10px] font-medium text-muted-foreground">
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {/* Horizontal lines */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map(hour => (
                <div key={`line-${hour}`} className="h-[60px] border-b border-border/40 border-dashed w-full" />
              ))}
            </div>

            {/* Vertical day columns & Events */}
            {days.map((day, colIndex) => {
              const dayEvents = events.filter(e => isSameDay(e.start, day) && e.isValidTime);
              const allDayEvents = events.filter(e => isSameDay(e.start, day) && !e.isValidTime);

              return (
                <div key={day.toISOString()} className="relative border-r border-border/40 border-dashed">
                  {/* All-day pseudo row at top */}
                  <div className="absolute top-0 w-full px-1 pt-1 z-20 flex flex-col gap-1">
                    {allDayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className={`text-[10px] font-semibold px-1 py-0.5 rounded shadow-sm cursor-pointer truncate ${getColors(event.type)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>

                  {/* Timed events */}
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      style={getEventStyle(event)}
                      className={`absolute left-1 right-1 rounded-md border shadow-sm p-1 overflow-hidden cursor-pointer transition-colors z-10 ${getColors(event.type)}`}
                    >
                      <div className="text-[10px] font-bold leading-tight truncate">{event.title}</div>
                      <div className="text-[9px] opacity-90 mt-0.5 font-medium truncate">
                        {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
