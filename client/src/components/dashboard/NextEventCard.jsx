import { Link } from "wouter";
import { Calendar } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { daysFromToday } from "@/hooks/useDashboardData";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

export function NextEventCard({ event, canAccess }) {
  const { tr, language } = useLanguage();
  const calendarCta = canAccess("/calendar") ? (
    <Button asChild variant="outline" size="sm" className="rounded-xl">
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

  const formatted = event.date
    ? new Date(event.date).toLocaleDateString(language === "ur" ? "ur-PK" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
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
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight tracking-tight">
              {event.title}
            </h3>
            {event.description ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {tr("dashboard", "when")}
          </div>
          <div className="text-sm font-semibold text-foreground">{formatted}</div>
          <div className="mt-1.5 text-xs font-medium text-primary">{when}</div>
        </div>
        {canAccess("/calendar") && (
          <Button asChild size="sm" variant="outline" className="mt-auto w-full rounded-xl">
            <Link href="/calendar">{tr("dashboard", "openCalendar")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
