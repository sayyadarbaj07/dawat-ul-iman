import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { ChartTooltipBox, DashCard, DashEmpty, DashHeader } from "./primitives";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
];

export function StudentMixChart({ mix, total }) {
  const { tr } = useLanguage();
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
            <div className="relative mx-auto h-[210px] w-full max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={4}
                    stroke="hsl(var(--card))"
                    strokeWidth={4}
                    animationBegin={80}
                    animationDuration={700}
                    animationEasing="ease-out"
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
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight">
                  {enrolled}
                </span>
                <span className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                  {tr("dashboard", "totalStudents")}
                </span>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {chartData.map((row, index) => {
                const pct = enrolled > 0 ? Math.round((row.value / enrolled) * 100) : 0;
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 text-[13px] font-medium"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.value}
                      <span className="ms-1.5 text-[11px]">({pct}%)</span>
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
