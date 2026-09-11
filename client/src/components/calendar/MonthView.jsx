import React from "react";
import { format, isSameMonth, isSameDay } from "date-fns";
import { getMonthDays } from "./utils";
import { EventItem } from "./EventItem";
import { useLanguage } from "@/context/LanguageContext";
import { toUrduDigits } from "@/utils/localizationUtils";

export function MonthView({ currentDate, events, onEventClick, onDayClick }) {
  const { tr, language } = useLanguage();
  const days = getMonthDays(currentDate);
  const weekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekDayLabels = {
    sun: language === "ur" ? "اتوار" : "Sun",
    mon: language === "ur" ? "پیر" : "Mon",
    tue: language === "ur" ? "منگل" : "Tue",
    wed: language === "ur" ? "بدھ" : "Wed",
    thu: language === "ur" ? "جمعرات" : "Thu",
    fri: language === "ur" ? "جمعہ" : "Fri",
    sat: language === "ur" ? "ہفتہ" : "Sat",
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="grid grid-cols-7 border-b border-border/60">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">
            {weekDayLabels[day]}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-auto">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const dayEvents = events.filter(e => isSameDay(e.start, day));
          const MAX_DISPLAY = 3;
          const displayEvents = dayEvents.slice(0, MAX_DISPLAY);
          const overflow = dayEvents.length - MAX_DISPLAY;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] border-b border-r border-border/40 p-1 lg:p-2 transition-colors hover:bg-muted/30 cursor-pointer flex flex-col gap-1 ${!isCurrentMonth ? "bg-muted/10 opacity-60" : ""
                }`}
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-white shadow-sm" : "text-foreground"
                  }`}>
                  {format(day, "d")}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {displayEvents.map(event => (
                  <EventItem key={event.id} event={event} onClick={onEventClick} isMonthView={true} />
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] font-semibold text-muted-foreground pl-1 mt-0.5">
                    {language === "ur" 
                      ? `+${toUrduDigits(overflow)} مزید`
                      : `+${overflow} more`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
