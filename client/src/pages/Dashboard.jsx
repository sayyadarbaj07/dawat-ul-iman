import React from "react";
import {
  Users,
  GraduationCap,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { formatRs, useDashboardData } from "@/hooks/useDashboardData";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { AttendanceOverview } from "@/components/dashboard/AttendanceOverview";
import { UpcomingExams } from "@/components/dashboard/UpcomingExams";
import { StudentMixChart } from "@/components/dashboard/StudentMixChart";
import { FinanceOverview } from "@/components/dashboard/FinanceOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ResidentialCard } from "@/components/dashboard/ResidentialCard";
import { NextEventCard } from "@/components/dashboard/NextEventCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { sectionMotion } from "@/components/dashboard/primitives";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <Skeleton className="h-52 w-full rounded-2xl sm:h-56" />
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tr } = useLanguage();
  const { user } = useAuth();
  const { loading, data } = useDashboardData(user);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const canAccess = data.canAccess;
  const attendanceValue = data.attendance.marked
    ? `${data.attendance.present}/${data.attendance.enrolled || data.attendance.present + data.attendance.absent}`
    : "—";
  const attendanceSubtitle = data.attendance.marked
    ? `${data.attendance.present} ${tr("attendance", "present")} · ${data.attendance.absent} ${tr("attendance", "absent")}`
    : tr("dashboard", "noAttendanceToday");

  return (
    <motion.div
      className="min-w-0 space-y-6 pb-8 sm:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div variants={sectionMotion}>
        <DashboardHero
          userName={user?.name || tr("common", "guest")}
          canAccess={canAccess}
        />
      </motion.div>

      <motion.div
        variants={sectionMotion}
        className="grid auto-rows-fr gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4"
      >
        {data.studentCount != null && (
          <StatCard
            title={tr("dashboard", "totalStudents")}
            value={data.studentCount}
            subtitle={
              data.admittedThisMonth
                ? tr("dashboard", "admittedThisMonth", {
                    count: data.admittedThisMonth,
                  })
                : undefined
            }
            sparkline={data.studentSpark}
            icon={<Users />}
            iconClassName="bg-primary/10 text-primary"
            className="bg-gradient-to-br from-card to-primary/5"
            delay={0}
          />
        )}
        {data.teacherCount != null && (
          <StatCard
            title={tr("dashboard", "activeTeachers")}
            value={data.teacherCount}
            icon={<GraduationCap />}
            iconClassName="bg-chart-4/10 text-chart-4"
            className="bg-gradient-to-br from-card to-chart-4/5"
            delay={0.06}
          />
        )}
        {data.attendanceOk && (
          <StatCard
            title={tr("dashboard", "todaysAttendance")}
            value={attendanceValue}
            subtitle={attendanceSubtitle}
            trend={
              data.attendance.marked && data.attendance.percent != null
                ? {
                    value: `${data.attendance.percent}%`,
                    isPositive: data.attendance.percent >= 75,
                  }
                : undefined
            }
            icon={<CheckCircle2 />}
            iconClassName="bg-accent/20 text-accent-foreground"
            className="bg-gradient-to-br from-card to-accent/10"
            delay={0.12}
          />
        )}
        {data.canShowFinance && data.balance != null && (
          <StatCard
            title={tr("dashboard", "accountBalance")}
            value={formatRs(data.balance)}
            icon={<Wallet />}
            iconClassName="bg-gold/15 text-gold"
            className="bg-gradient-to-br from-card via-card to-gold/10 border-gold/20"
            delay={0.18}
          />
        )}
      </motion.div>

      <motion.div variants={sectionMotion} className="grid min-w-0 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
        {data.attendanceOk && (
          <div className="min-w-0 lg:col-span-7">
            <AttendanceOverview
              attendance={data.attendance}
              canAccess={canAccess}
            />
          </div>
        )}
        {data.examsOk && (
          <div className={data.attendanceOk ? "min-w-0 lg:col-span-5" : "min-w-0 lg:col-span-12"}>
            <UpcomingExams exams={data.upcomingExams} canAccess={canAccess} />
          </div>
        )}
      </motion.div>

      <motion.div
        variants={sectionMotion}
        className="grid min-w-0 items-stretch gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
      >
        {data.studentListOk && (
          <StudentMixChart mix={data.studentMix} total={data.studentCount} />
        )}
        {data.financeListOk && (
          <FinanceOverview
            chart={data.financeChart}
            transactions={data.recentTransactions}
            canAccess={canAccess}
          />
        )}
        <QuickActions canAccess={canAccess} />
      </motion.div>

      <motion.div
        variants={sectionMotion}
        className="grid min-w-0 items-stretch gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3"
      >
        {data.studentListOk && (
          <ResidentialCard
            residential={data.residential}
            dayScholars={data.dayScholars}
            total={data.studentCount || 0}
          />
        )}
        {data.eventsOk && (
          <NextEventCard event={data.nextEvent} canAccess={canAccess} />
        )}
        <ActivityFeed
          logs={data.activityLogs}
          transactions={
            data.logsOk ? [] : data.financeListOk ? data.recentTransactions : []
          }
          events={data.logsOk || data.financeListOk ? [] : data.weekAlerts}
          meetings={
            data.logsOk || data.financeListOk || data.weekAlerts?.length
              ? []
              : data.upcomingMeetings
          }
          canAccess={canAccess}
        />
      </motion.div>
    </motion.div>
  );
}
