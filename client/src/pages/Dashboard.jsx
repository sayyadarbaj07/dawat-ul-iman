import React from "react";
import {
  Users,
  GraduationCap,
  CheckCircle2,
  Wallet,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOCK_TRANSACTIONS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLanguage } from "@/context/LanguageContext";

export default function Dashboard() {
  const { tr, t } = useLanguage();
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      className="space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {tr("dashboard", "overview")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {tr("dashboard", "subtitle")}
          </p>
        </div>
        <BrandLogo
          className="text-foreground"
          size="md"
          textClassName="text-foreground font-semibold"
          imageClassName="object-cover"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={tr("dashboard", "totalStudents")}
          value="347"
          subtitle={tr("dashboard", "plus12Month")}
          icon={<Users />}
          delay={0.1}
        />
        <StatCard
          title={tr("dashboard", "activeTeachers")}
          value="24"
          icon={<GraduationCap />}
          delay={0.2}
        />
        <StatCard
          title={tr("dashboard", "todaysAttendance")}
          value="298/347"
          subtitle={`85% ${tr("dashboard", "overall")}`}
          icon={<CheckCircle2 />}
          trend={{ value: "+2%", isPositive: true }}
          delay={0.3}
        />
        <StatCard
          title={tr("dashboard", "accountBalance")}
          value="Rs 43,500"
          icon={<Wallet />}
          delay={0.4}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div
          variants={itemVariants}
          className="col-span-4 lg:col-span-4"
        >
          <Card className="h-full border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{tr("dashboard", "attendanceSummary")}</CardTitle>
              <CardDescription>
                {tr("dashboard", "attendanceBreakdown")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground">
                    {tr("curriculum", "diniyat")}{" "}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (dinyat)
                    </span>
                  </span>
                  <span className="text-xs font-medium">
                    <span className="text-emerald-600">112 P</span> <span className="text-muted-foreground/40 mx-1">/</span>{" "}
                    <span className="text-red-500">18 A</span>
                  </span>
                </div>
                <ProgressBar value={86} className="h-2 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground">
                    {tr("curriculum", "arabic")}{" "}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (arabi)
                    </span>
                  </span>
                  <span className="text-xs font-medium">
                    <span className="text-emerald-600">95 P</span> <span className="text-muted-foreground/40 mx-1">/</span>{" "}
                    <span className="text-red-500">12 A</span>
                  </span>
                </div>
                <ProgressBar value={89} className="h-2 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground">
                    {tr("curriculum", "contemporary")}{" "}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (Asri Uloom)
                    </span>
                  </span>
                  <span className="text-xs font-medium">
                    <span className="text-emerald-600">91 P</span> <span className="text-muted-foreground/40 mx-1">/</span>{" "}
                    <span className="text-red-500">19 A</span>
                  </span>
                </div>
                <ProgressBar value={83} className="h-2 rounded-full" />
              </div>

              <div className="pt-5 mt-2 border-t border-border/40 flex justify-between items-center">
                <div className="text-sm font-medium text-muted-foreground">
                  {tr("dashboard", "overallProgress")}
                </div>
                <div className="text-2xl font-bold tracking-tight text-primary">85%</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-3 lg:col-span-3"
        >
          <Card className="h-full flex flex-col border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{tr("dashboard", "upcomingExams")}</CardTitle>
              <CardDescription>
                {tr("dashboard", "examDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <div className="group flex items-start gap-4 p-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer">
                <div className="bg-amber-500/10 p-2.5 rounded-lg text-amber-600 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {tr("dashboard", "monthlyTestDiniyat")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Jun 28 • <span className="text-amber-600">5 days left</span>
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-4 p-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer">
                <div className="bg-primary/10 p-2.5 rounded-lg text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {tr("dashboard", "halfYearlyExams")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Aug 15 • {tr("dashboard", "allDepartments")}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-auto border-border/50 hover:bg-muted/50 rounded-xl" size="sm">
                {tr("dashboard", "viewAllSchedule")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          variants={itemVariants}
          className="col-span-1 lg:col-span-1"
        >
          <Card className="h-full border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{tr("dashboard", "hostelStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-6">
                <span className="text-4xl font-bold tracking-tight text-foreground">142</span>
                <span className="text-sm font-medium text-muted-foreground">
                  / 150 {tr("dashboard", "beds")}
                </span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2 text-foreground/80">
                    <span>{tr("dashboard", "blockA")}</span>
                    <span>75/75</span>
                  </div>
                  <ProgressBar
                    value={100}
                    colorClass="bg-amber-500"
                    showValue={false}
                    className="h-2 rounded-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2 text-foreground/80">
                    <span>{tr("dashboard", "blockB")}</span>
                    <span>67/75</span>
                  </div>
                  <ProgressBar
                    value={89}
                    colorClass="bg-primary"
                    showValue={false}
                    className="h-2 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-1 lg:col-span-1"
        >
          <Card className="h-full border-transparent shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Award className="w-32 h-32 transform rotate-12" />
            </div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-primary-foreground/90 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                <Award className="h-4 w-4" /> {tr("dashboard", "nextActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <h3 className="text-2xl font-bold mt-2 leading-tight tracking-tight">
                Bazm-e-Tariq bin Ziyad
              </h3>
              <p className="text-primary-foreground/80 text-sm mt-2 mb-6 font-medium">
                {tr("dashboard", "weeklySpeechCompetition")}
              </p>

              <div className="bg-black/10 rounded-xl p-3.5 backdrop-blur-md border border-white/10">
                <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-semibold mb-1">
                  {tr("dashboard", "when")}
                </div>
                <div className="text-sm font-semibold">
                  {tr("dashboard", "nextSaturday")},{" "}
                  {tr("dashboard", "nextSaturdayTime")}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-2 lg:col-span-1"
        >
          <Card className="h-full border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{tr("dashboard", "recentTransactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_TRANSACTIONS.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl border border-transparent group-hover:border-border/50 transition-all",
                          tx.type === "income"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-red-500/10 text-red-600",
                        )}
                      >
                        {tx.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {tx.date}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold whitespace-nowrap",
                        tx.type === "income"
                          ? "text-emerald-600"
                          : "text-red-600",
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}Rs {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
