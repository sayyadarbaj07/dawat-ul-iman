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
import { Wallet } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { formatRs } from "@/hooks/useDashboardData";
import { ChartTooltipBox, DashCard, DashEmpty, DashHeader } from "./primitives";

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
          <div className="h-[210px] min-h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={8} barCategoryGap="30%">
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.65}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  content={<ChartTooltipBox valueFormatter={(value) => formatRs(value)} />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
                <Bar
                  dataKey="income"
                  name={tr("dashboard", "income")}
                  fill="hsl(var(--chart-1))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                  animationDuration={650}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="expense"
                  name={tr("dashboard", "expense")}
                  fill="hsl(var(--chart-2))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                  animationDuration={650}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {transactions?.length > 0 && (
          <div className="divide-y divide-border/50">
            {transactions.slice(0, 3).map((tx) => (
              <div
                key={tx._id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.date
                      ? new Date(tx.date).toLocaleDateString(
                          language === "ur" ? "ur-PK" : "en-GB",
                          { day: "numeric", month: "short" },
                        )
                      : ""}
                  </p>
                </div>
                <span
                  className={
                    tx.type === "income"
                      ? "shrink-0 text-sm font-semibold tabular-nums text-primary"
                      : "shrink-0 text-sm font-semibold tabular-nums text-gold"
                  }
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatRs(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {canAccess("/finance") && (
          <Button asChild variant="outline" size="sm" className="mt-auto w-full rounded-xl">
            <Link href="/finance">{tr("dashboard", "viewFinance")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
