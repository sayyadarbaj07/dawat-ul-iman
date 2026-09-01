import { Link } from "wouter";
import { ClipboardCheck } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { DashCard, DashEmpty, DashHeader, SoftProgress } from "./primitives";

export function AttendanceOverview({ attendance, canAccess }) {
  const { tr } = useLanguage();
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
                <Button asChild size="sm" className="rounded-xl">
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
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-foreground">
                      {tr("curriculum", row.key)}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      <span className="text-primary">
                        {row.present} {tr("dashboard", "presentShort")}
                      </span>
                      <span className="mx-1 text-border">/</span>
                      <span className="text-destructive">
                        {row.absent} {tr("dashboard", "absentShort")}
                      </span>
                      {row.late > 0 ? (
                        <>
                          <span className="mx-1 text-border">/</span>
                          <span className="text-gold">
                            {row.late} {tr("dashboard", "lateShort")}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <SoftProgress value={row.hasRecords ? row.percent : 0} />
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="text-sm font-medium text-muted-foreground">
                {tr("dashboard", "overallProgress")}
              </div>
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-primary">
                {attendance?.percent != null ? `${attendance.percent}%` : "—"}
              </div>
            </div>
          </>
        )}

        {hasAny && canAccess("/attendance") && (
          <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
            <Link href="/attendance">{tr("dashboard", "viewAttendance")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
