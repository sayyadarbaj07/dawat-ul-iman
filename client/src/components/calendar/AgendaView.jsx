import React from "react";
import { format, isSameDay } from "date-fns";
import { EventItem } from "./EventItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatHijriDate } from "./utils";

export function AgendaView({ events, onEventClick }) {
  const { tr, language } = useLanguage();
  // Group events by day
  const groupedEvents = events.reduce((acc, event) => {
    const dateStr = format(event.start, "yyyy-MM-dd");
    if (!acc[dateStr]) acc[dateStr] = { date: event.start, events: [] };
    acc[dateStr].events.push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex-1 bg-card flex items-center justify-center p-8">
        <EmptyState
          title={tr("calendar", "noUpcomingEvents")}
          description={tr("calendar", "noUpcomingEventsDesc")}
          icon={CalendarDays}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-card p-4 sm:p-6 space-y-8 scrollbar-thin">
      {sortedDates.map(dateStr => {
        const { date, events: dayEvents } = groupedEvents[dateStr];
        const isToday = isSameDay(date, new Date());

        return (
          <div key={dateStr} className="relative">
            <div className="flex items-end gap-3 border-b border-border/60 pb-2 mb-4 sticky top-0 bg-card/95 backdrop-blur z-10 py-2">
              <span className={`text-2xl font-black ${isToday ? "text-primary" : "text-foreground"}`}>
                {format(date, "d")}
              </span>
              <span className={`text-sm font-bold uppercase mb-1 ${isToday ? "text-primary/80" : "text-muted-foreground"}`}>
                {language === "ur" ? tr("calendar", format(date, "EEEE")) : format(date, "EEEE")}
              </span>
              <span className="text-sm font-medium text-muted-foreground mb-1 ml-auto">
                {language === "ur" 
                  ? `${tr("calendar", format(date, "MMMM"))} ${format(date, "yyyy")}`
                  : format(date, "MMMM yyyy")}
              </span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground/70 mb-2 px-1">
              {formatHijriDate(date, language, 'full')}
            </div>

            <div className="grid gap-3 pl-2 sm:pl-8">
              {dayEvents.map(event => (
                <EventItem key={event.id} event={event} onClick={onEventClick} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
