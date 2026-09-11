import React from "react";
import { format } from "date-fns";

export function EventItem({ event, onClick, isMonthView = false }) {
  const getColors = (type) => {
    switch (type) {
      case "meeting": return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/30";
      case "activity": return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 hover:border-amber-300";
      case "holiday": return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300";
      default: return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300";
    }
  };

  const timeString = event.isValidTime ? format(event.start, "HH:mm") : "";

  if (isMonthView) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(event); }}
        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-sm truncate cursor-pointer transition-colors border ${getColors(event.type)}`}
        title={`${timeString ? timeString + " " : ""}${event.title}`}
      >
        {timeString && <span className="opacity-70 mr-1 font-medium">{timeString}</span>}
        {event.title}
      </div>
    );
  }

  // Agenda/List style
  return (
    <div
      onClick={() => onClick(event)}
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border shadow-sm cursor-pointer transition-colors ${getColors(event.type)}`}
    >
      <div className="flex flex-col">
        <span className="font-bold text-sm">{event.title}</span>
        {event.isValidTime && (
          <span className="text-xs opacity-80 mt-0.5">
            {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
          </span>
        )}
      </div>
      <div className="flex flex-col sm:items-end mt-2 sm:mt-0">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/50 border border-black/5 capitalize">
          {event.sourceType || event.type}
        </span>
        {event.className && (
          <span className="text-[10px] font-medium opacity-70 mt-1 truncate max-w-[120px]">
            {event.className}
          </span>
        )}
      </div>
    </div>
  );
}
