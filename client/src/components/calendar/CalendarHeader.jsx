import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";

export function CalendarHeader({ 
  currentDate, 
  view, 
  setView, 
  onNext, 
  onPrev, 
  onToday,
  filter,
  setFilter 
}) {
  const { tr } = useLanguage();

  const getHeaderLabel = () => {
    const month = format(currentDate, "MMMM");
    const year = format(currentDate, "yyyy");
    const localizedMonth = tr("calendar", month) || month;
    
    if (view === "month") return `${localizedMonth} ${year}`;
    if (view === "week") {
      const shortMonth = format(currentDate, "MMM");
      const localizedShortMonth = tr("calendar", shortMonth) || shortMonth;
      return `${tr("calendar", "week")} ${format(currentDate, "d")} ${localizedShortMonth}, ${year}`;
    }
    if (view === "day" || view === "agenda") return `${format(currentDate, "d")} ${localizedMonth}, ${year}`;
    return `${localizedMonth} ${year}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border/60 bg-card rounded-t-xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onToday} className="font-semibold text-primary">
          {tr("calendar", "today") || "Today"}
        </Button>
        <div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onNext}>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground ms-2 min-w-[160px]" dir="auto">
          {getHeaderLabel()}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={tr("calendar", "all") || "Filter Events"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tr("calendar", "all") || "All Events"}</SelectItem>
            <SelectItem value="meeting">{tr("calendar", "meetings") || "Meetings"}</SelectItem>
            <SelectItem value="activity">{tr("calendar", "activities") || "Activities"}</SelectItem>
            <SelectItem value="holiday">{tr("calendar", "holidays") || "Holidays"}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/60">
          {["month", "week", "day", "agenda"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${
                view === v 
                  ? "bg-white text-primary shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {tr("calendar", v) || v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
