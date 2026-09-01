import { Home } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

export function ResidentialCard({ residential, dayScholars, total }) {
  const { tr } = useLanguage();
  const resPct = total > 0 ? Math.round((residential / total) * 100) : 0;
  const dayPct = total > 0 ? Math.round((dayScholars / total) * 100) : 0;

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("dashboard", "residentialStudents")}
        description={tr("dashboard", "residentialHint")}
      />
      <CardContent className="flex flex-1 flex-col p-5 pt-0 sm:p-6 sm:pt-0">
        {total > 0 ? (
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[2rem] font-semibold leading-none tabular-nums tracking-tight">
                  {residential}
                </p>
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                  {tr("students", "residential")}
                  <span className="ms-1.5 tabular-nums text-primary">{resPct}%</span>
                </p>
              </div>
              <p className="pb-1 text-sm font-medium tabular-nums text-muted-foreground">
                / {total} {tr("dashboard", "enrolled")}
              </p>
            </div>

            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${residential} ${tr("students", "residential")}, ${dayScholars} ${tr("students", "dayScholar")}`}
            >
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${resPct}%` }}
              />
              <div
                className="h-full bg-chart-2/80 transition-[width] duration-500"
                style={{ width: `${dayPct}%` }}
              />
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary/5 px-3 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {tr("students", "residential")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {residential}
                  <span className="ms-1 text-xs font-medium text-muted-foreground">
                    {resPct}%
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-gold/10 px-3 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  {tr("students", "dayScholar")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {dayScholars}
                  <span className="ms-1 text-xs font-medium text-muted-foreground">
                    {dayPct}%
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <DashEmpty
            icon={Home}
            message={tr("dashboard", "noStudentsYet")}
            description={tr("dashboard", "noStudentsHint")}
          />
        )}
      </CardContent>
    </DashCard>
  );
}
