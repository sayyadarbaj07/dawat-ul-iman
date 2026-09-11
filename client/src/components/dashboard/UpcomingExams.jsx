import { Link } from "wouter";
import { FileSpreadsheet } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { daysFromToday } from "@/hooks/useDashboardData";
import { formatLocalizedNumber } from "@/utils/localizationUtils";
import { DashCard, DashEmpty, DashHeader } from "./primitives";
import { cn } from "@/lib/utils";

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
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {!exams?.length ? (
          <DashEmpty
            icon={FileSpreadsheet}
            message={tr("dashboard", "noUpcomingExams")}
            description={tr("dashboard", "noUpcomingExamsHint")}
            action={
              canAccess("/exams") ? (
                <Button asChild size="sm" variant="outline" className="min-h-[36px] rounded-[10px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 mt-2 font-bold text-slate-700 dark:text-slate-300 transition-all">
                  <Link href="/exams">{tr("dashboard", "viewAllSchedule")}</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {exams.map((exam) => {
              const date = exam.date ? new Date(exam.date) : null;
              const day = date
                ? formatLocalizedNumber(date.getDate(), language)
                : "—";
              const month = date
                ? date.toLocaleDateString(locale, { month: "short" })
                : "";
              
              const isSoon = daysFromToday(exam.date) <= 3;
                
              return (
                <li key={exam._id}>
                  <div className="flex items-center gap-4 rounded-[12px] p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className={cn(
                      "flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[12px]",
                      isSoon ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                    )}>
                      <span className="text-[10.5px] font-bold uppercase tracking-wider leading-none">
                        {month}
                      </span>
                      <span className="text-[16px] font-bold leading-none tabular-nums mt-1">
                        {day}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[14px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {exam.name}
                      </h4>
                      <p className="mt-1 text-[12.5px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        {exam.class && (
                          <>
                            <span className="truncate max-w-[120px] inline-block align-bottom">{exam.class}</span>
                            <span className="opacity-50">•</span>
                          </>
                        )}
                        <span className={cn(
                          "font-bold tracking-wide",
                          isSoon ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
                        )}>{examTiming(exam.date, tr)}</span>
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
            className="mt-auto w-full min-h-[40px] rounded-[12px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition-all text-slate-700 dark:text-slate-300"
          >
            <Link href="/exams">{tr("dashboard", "viewAllSchedule")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
