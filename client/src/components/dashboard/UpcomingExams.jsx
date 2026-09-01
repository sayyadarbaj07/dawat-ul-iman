import { Link } from "wouter";
import { FileSpreadsheet } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { daysFromToday } from "@/hooks/useDashboardData";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

function examTiming(date, tr) {
  const days = daysFromToday(date);
  if (days === 0) return tr("dashboard", "today");
  if (days === 1) return tr("dashboard", "tomorrow");
  return tr("dashboard", "daysLeft", { count: days });
}

export function UpcomingExams({ exams, canAccess }) {
  const { tr, language } = useLanguage();
  const locale = language === "ur" ? "ur-PK" : "en-GB";

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("dashboard", "upcomingExams")}
        description={tr("dashboard", "examDescription")}
      />
      <CardContent className="flex flex-1 flex-col gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {!exams?.length ? (
          <DashEmpty
            icon={FileSpreadsheet}
            message={tr("dashboard", "noUpcomingExams")}
            description={tr("dashboard", "noUpcomingExamsHint")}
            action={
              canAccess("/exams") ? (
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/exams">{tr("dashboard", "viewAllSchedule")}</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-border/50">
            {exams.map((exam) => {
              const date = exam.date ? new Date(exam.date) : null;
              const day = date
                ? date.toLocaleDateString(locale, { day: "numeric" })
                : "—";
              const month = date
                ? date.toLocaleDateString(locale, { month: "short" })
                : "";
              return (
                <li key={exam._id}>
                  <div className="flex items-center gap-3 rounded-xl px-1.5 py-3 transition-colors duration-200 hover:bg-muted/50">
                    <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {month}
                      </span>
                      <span className="text-sm font-semibold leading-none tabular-nums">
                        {day}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-semibold text-foreground">
                        {exam.name}
                      </h4>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {exam.class ? `${exam.class} · ` : ""}
                        <span className="text-gold">{examTiming(exam.date, tr)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {exams?.length > 0 && canAccess("/exams") && (
          <Button
            asChild
            variant="outline"
            className="mt-auto w-full rounded-xl"
            size="sm"
          >
            <Link href="/exams">{tr("dashboard", "viewAllSchedule")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
