import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { formatRs } from "@/hooks/useDashboardData";
import { formatLocalizedDate } from "@/utils/localizationUtils";
import { ChartTooltipBox, DashCard, DashEmpty, DashHeader } from "./primitives";
import { cn } from "@/lib/utils";

export function FinanceOverview({ chart, transactions, canAccess }) {
  const { tr, language } = useLanguage();

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("finance", "incomeVsExpenses")}
        description={tr("finance", "incomeVsExpensesDescription")}
      />
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {!chart?.length ? (
          <DashEmpty
            icon={Wallet}
            message={tr("dashboard", "noTransactions")}
            description={tr("dashboard", "noTransactionsHint")}
          />
        ) : (
          <div className="h-[200px] min-h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={6} barCategoryGap="25%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "currentColor", fontWeight: 500, className: "text-slate-500" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor", fontWeight: 500, className: "text-slate-500" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  dx={-10}
                />
                <Tooltip
                  content={<ChartTooltipBox valueFormatter={(value) => formatRs(value, language)} />}
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 16 }}
                />
                <Bar
                  dataKey="income"
                  name={tr("dashboard", "income")}
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="expense"
                  name={tr("dashboard", "expense")}
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {transactions?.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {transactions.slice(0, 3).map((tx) => (
              <div
                key={tx._id}
                className="flex items-center justify-between gap-3 rounded-[12px] p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex shrink-0 h-9 w-9 items-center justify-center rounded-[10px]",
                    tx.type === "income" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  )}>
                    {tx.type === "income" ? <ArrowDownRight className="h-4 w-4" strokeWidth={2.5} /> : <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{tx.description}</p>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatLocalizedDate(tx.date, language, "dd MMM")}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[14px] font-bold tabular-nums",
                    tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {tx.type === "income" ? "+" : "-"}
                   {formatRs(tx.amount, language)}
                </span>
              </div>
            ))}
          </div>
        )}

        {canAccess("/finance") && (
          <Button asChild variant="outline" className="mt-auto w-full min-h-[40px] rounded-[12px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition-all text-slate-700 dark:text-slate-300">
            <Link href="/finance">{tr("dashboard", "viewFinance")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
