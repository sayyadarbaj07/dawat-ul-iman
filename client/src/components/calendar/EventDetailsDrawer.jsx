import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MapPin, Clock, AlignLeft, Users, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatHijriDate } from "./utils";

export function EventDetailsDrawer({ event, open, onOpenChange, canManage, onDelete, onEdit }) {
  const { tr, language } = useLanguage();
  if (!event) return null;

  const isHoliday = event.type === "holiday";
  
  const formatDateStr = (date) => {
    const day = format(date, "d");
    const year = format(date, "yyyy");
    if (language === "ur") {
      return `${tr("calendar", format(date, "EEEE"))}, ${tr("calendar", format(date, "MMMM"))} ${day}, ${year}`;
    }
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const startFormat = formatDateStr(event.start);
  const endFormat = formatDateStr(event.end);
  const isSingleDay = startFormat === endFormat;
  
  const dateStr = (isHoliday && !isSingleDay) 
    ? `${startFormat} — ${endFormat}` 
    : startFormat;
    
  const timeStr = isHoliday ? tr("calendar", "allDay") : (event.isValidTime ? `${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")}` : tr("calendar", "allDay"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex justify-between items-start mt-2">
            <DialogTitle className="text-xl font-bold leading-tight pr-4">{event.title}</DialogTitle>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-muted rounded text-muted-foreground shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
              {tr("calendar", event.sourceType || event.type) || (event.sourceType || event.type)}
            </span>
          </div>
          <DialogDescription className="text-sm font-medium text-foreground mt-1">
            {dateStr}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          <div className="flex items-start gap-3 text-sm">
            <Clock className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <div className="font-semibold">{dateStr}</div>
              <div className="text-xs text-muted-foreground/80 font-medium">{formatHijriDate(event.start, language, 'full')}</div>
              <div className="text-muted-foreground mt-0.5">{timeStr}</div>
            </div>
          </div>

          {event.className && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="w-4 h-4 text-primary mt-0.5" />
              <div className="font-medium">{tr("common", "class")}: {event.className}</div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-lg border border-border/40">
              <AlignLeft className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</div>
            </div>
          )}

          {event.source?.location && !event.joinUrl && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="font-medium text-muted-foreground">{event.source.location}</div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between border-t border-border/40 pt-4 mt-2">
          {canManage && event.type !== "exam" ? (
            <div className="flex gap-2">
              <Button variant="outline" className="text-primary border-primary" onClick={() => onEdit(event)}>
                {tr("common", "edit")}
              </Button>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(event)}>
                <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {tr("common", "delete")}
              </Button>
            </div>
          ) : (
            <div></div> // Spacer
          )}
          
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{tr("common", "close")}</Button>
            {event.joinUrl && (
              <Button onClick={() => window.open(event.joinUrl, '_blank')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                Join Meeting
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
