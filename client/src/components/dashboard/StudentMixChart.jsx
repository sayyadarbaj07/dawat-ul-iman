import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedPercent } from "@/utils/localizationUtils";
import { ChartTooltipBox, DashCard, DashHeader, DashEmpty } from "./primitives";

const COLORS = [
  "#10B981", // emerald-500
  "#3B82F6", // blue-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
];

export function StudentMixChart({ mix, total }) {
  const { tr, language } = useLanguage();
  const chartData = (mix || []).map((row) => ({
    name: tr("curriculum", row.key),
    value: row.value,
  }));
  const enrolled = total || chartData.reduce((sum, row) => sum + row.value, 0);

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("dashboard", "studentMix")}
        description={tr("dashboard", "studentMixHint")}
      />
      <CardContent className="flex flex-1 flex-col p-5 pt-0 sm:p-6 sm:pt-0">
        {!chartData.length ? (
          <DashEmpty
            icon={Users}
            message={tr("dashboard", "noStudentsYet")}
            description={tr("dashboard", "noStudentsHint")}
          />
        ) : (
          <>
            <div className="relative mx-auto h-[200px] w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={3}
                    stroke="none"
                    animationBegin={100}
                    animationDuration={800}
                    animationEasing="ease-out"
                    cornerRadius={4}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltipBox />}
                    cursor={false}
                    wrapperStyle={{ outline: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
                <span className="text-[32px] font-bold leading-none tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
                  {formatLocalizedNumber(enrolled, language)}
                </span>
                <span className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {tr("dashboard", "totalStudents")}
                </span>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {chartData.map((row, index) => {
                const pct = enrolled > 0 ? Math.round((row.value / enrolled) * 100) : 0;
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-[14px] font-medium bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                        style={{ background: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-semibold">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground font-bold">
                      {formatLocalizedNumber(row.value, language)}
                      <span className="ms-2 text-[12.5px] font-medium text-slate-400 w-10 inline-block text-end">
                        {formatLocalizedPercent(pct, language)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </DashCard>
  );
}
