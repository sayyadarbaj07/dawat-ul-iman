import { Link } from "wouter";
import { ClipboardCheck } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedPercent } from "@/utils/localizationUtils";
import { DashCard, DashEmpty, DashHeader, SoftProgress } from "./primitives";

export function AttendanceOverview({ attendance, canAccess }) {
  const { tr, language } = useLanguage();
  const classes = attendance?.classes || [];
  const hasAny = classes.some((row) => row.hasRecords);

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("dashboard", "attendanceSummary")}
        description={tr("dashboard", "attendanceBreakdown")}
      />
      <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
        {!hasAny ? (
          <DashEmpty
            icon={ClipboardCheck}
            message={tr("dashboard", "noAttendanceToday")}
            description={tr("dashboard", "noAttendanceHint")}
            action={
              canAccess("/attendance") ? (
                <Button asChild size="sm" variant="outline" className="min-h-[36px] rounded-[10px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 mt-2 font-bold text-slate-700 dark:text-slate-300 transition-all">
                  <Link href="/attendance">{tr("dashboard", "viewAttendance")}</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {classes.map((row) => (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-300">
                      {tr("curriculum", row.key)}
                    </span>
                    <span className="shrink-0 text-[12px] font-bold tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatLocalizedNumber(row.present, language)} {tr("dashboard", "presentShort")}
                      </span>
                      <span className="mx-1.5 text-slate-200 dark:text-slate-800">|</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {formatLocalizedNumber(row.absent, language)} {tr("dashboard", "absentShort")}
                      </span>
                      {row.late > 0 ? (
                        <>
                          <span className="mx-1.5 text-slate-200 dark:text-slate-800">|</span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatLocalizedNumber(row.late, language)} {tr("dashboard", "lateShort")}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <SoftProgress value={row.hasRecords ? row.percent : 0} />
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4">
              <div className="text-[13.5px] font-bold text-emerald-800 dark:text-emerald-300">
                {tr("dashboard", "overallProgress")}
              </div>
              <div className="text-[28px] font-[750] tabular-nums tracking-[-0.02em] text-emerald-600 dark:text-emerald-400">
                {attendance?.percent != null ? formatLocalizedPercent(attendance.percent, language) : "—"}
              </div>
            </div>
          </>
        )}

        {hasAny && canAccess("/attendance") && (
          <Button asChild variant="outline" className="mt-auto w-full min-h-[40px] rounded-[12px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition-all text-slate-700 dark:text-slate-300">
            <Link href="/attendance">{tr("dashboard", "viewAttendance")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
