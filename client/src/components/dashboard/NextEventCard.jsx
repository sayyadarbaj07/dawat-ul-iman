import { Link } from "wouter";
import { Calendar } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { daysFromToday } from "@/hooks/useDashboardData";
import { toUrduDigits } from "@/utils/localizationUtils";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

export function NextEventCard({ event, canAccess }) {
  const { tr, language } = useLanguage();
  const calendarCta = canAccess("/calendar") ? (
    <Button asChild variant="outline" size="sm" className="min-h-[36px] rounded-[10px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 mt-2 font-bold text-slate-700 dark:text-slate-300 transition-all">
      <Link href="/calendar">{tr("dashboard", "openCalendar")}</Link>
    </Button>
  ) : null;

  if (!event) {
    return (
      <DashCard className="flex flex-col">
        <DashHeader title={tr("dashboard", "nextActivity")} />
        <CardContent className="flex flex-1 flex-col p-5 pt-0 sm:p-6 sm:pt-0">
          <DashEmpty
            icon={Calendar}
            message={tr("dashboard", "noEvents")}
            description={tr("dashboard", "noEventsHint")}
            action={calendarCta}
          />
        </CardContent>
      </DashCard>
    );
  }

  const rawFormatted = event.date
    ? new Date(event.date).toLocaleDateString(language === "ur" ? "ur-PK" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const formatted = language === "ur" ? toUrduDigits(rawFormatted) : rawFormatted;
  const days = daysFromToday(event.date);
  const when =
    days === 0
      ? tr("dashboard", "today")
      : days === 1
        ? tr("dashboard", "tomorrow")
        : tr("dashboard", "daysLeft", { count: days });

  return (
    <DashCard className="flex flex-col">
      <DashHeader title={tr("dashboard", "nextActivity")} />
      <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="flex items-start gap-4">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Calendar className="h-[22px] w-[22px]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-200">
              {event.title}
            </h3>
            {event.description ? (
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                {event.description}
              </p>
            ) : null}
          </div>
        </div>
        
        <div className="rounded-[12px] bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {tr("dashboard", "when")}
          </div>
          <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{formatted}</div>
          <div className="mt-1 text-[13px] font-bold text-violet-600 dark:text-violet-400">{when}</div>
        </div>
        
        {canAccess("/calendar") && (
          <Button asChild variant="outline" className="mt-auto w-full min-h-[40px] rounded-[12px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition-all text-slate-700 dark:text-slate-300">
            <Link href="/calendar">{tr("dashboard", "openCalendar")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
