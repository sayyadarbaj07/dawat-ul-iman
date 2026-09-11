import { Home } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedPercent } from "@/utils/localizationUtils";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

export function ResidentialCard({ residential, dayScholars, total }) {
  const { tr, language } = useLanguage();
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
                <p className="text-[36px] font-[750] leading-none tabular-nums tracking-[-0.02em] text-slate-900 dark:text-white">
                  {formatLocalizedNumber(residential, language)}
                </p>
                <p className="mt-1.5 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                  {tr("students", "residential")}
                  <span className="ms-2 tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">{formatLocalizedPercent(resPct, language)}</span>
                </p>
              </div>
              <p className="pb-1 text-[12px] font-bold tabular-nums text-slate-400 uppercase tracking-wider">
                / {formatLocalizedNumber(total, language)} {tr("dashboard", "enrolled")}
              </p>
            </div>

            <div
              className="flex h-[8px] sm:h-[10px] w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="img"
              aria-label={`${residential} ${tr("students", "residential")}, ${dayScholars} ${tr("students", "dayScholar")}`}
            >
              <div
                className="h-full bg-emerald-500 transition-[width] duration-700 ease-[cubic-bezier(0.2,0,0,1)]"
                style={{ width: `${resPct}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-[width] duration-700 ease-[cubic-bezier(0.2,0,0,1)]"
                style={{ width: `${dayPct}%` }}
              />
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {tr("students", "residential")}
                </p>
                <p className="mt-1 text-[18px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatLocalizedNumber(residential, language)}
                  <span className="ms-1.5 text-[12px] font-semibold text-emerald-600/70 dark:text-emerald-400/70">
                    {formatLocalizedPercent(resPct, language)}
                  </span>
                </p>
              </div>
              <div className="rounded-[12px] bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-[12px] font-bold text-blue-800 dark:text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {tr("students", "dayScholar")}
                </p>
                <p className="mt-1 text-[18px] font-bold tabular-nums text-blue-700 dark:text-blue-400">
                  {formatLocalizedNumber(dayScholars, language)}
                  <span className="ms-1.5 text-[12px] font-semibold text-blue-600/70 dark:text-blue-400/70">
                    {formatLocalizedPercent(dayPct, language)}
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
