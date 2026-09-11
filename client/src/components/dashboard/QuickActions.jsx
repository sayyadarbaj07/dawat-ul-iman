import { Link } from "wouter";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  Landmark,
  BarChart3,
  Calendar,
  ArrowRight
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { DashCard, DashHeader } from "./primitives";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/students", key: "addStudent", icon: Users, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { href: "/teachers", key: "addTeacher", icon: GraduationCap, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { href: "/attendance", key: "markAttendance", icon: CalendarCheck, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { href: "/exams", key: "viewExams", icon: FileSpreadsheet, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { href: "/finance", key: "newTransaction", icon: Landmark, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { href: "/reports", key: "generateReport", icon: BarChart3, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { href: "/calendar", key: "viewCalendar", icon: Calendar, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
];

export function QuickActions({ canAccess }) {
  const { tr } = useLanguage();
  const items = ACTIONS.filter((item) => canAccess(item.href));

  if (!items.length) return null;

  return (
    <DashCard className="flex flex-col">
      <DashHeader
        title={tr("dashboard", "quickActions")}
        description={tr("dashboard", "quickActionsHint")}
      />
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-[14px] p-4",
                "border border-slate-800/[0.06] dark:border-white/10 bg-white dark:bg-slate-900/50",
                "shadow-[0_1px_3px_rgba(15,23,42,0.03),0_4px_8px_-2px_rgba(15,23,42,0.02)]",
                "transition-all duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)]",
                "hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_12px_24px_rgba(15,23,42,0.04)]",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] transition-transform duration-300 group-hover:scale-105", item.color)}>
                  <item.icon className="h-[20px] w-[20px]" strokeWidth={2} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
              </div>
              <span className="mt-4 text-[13.5px] font-bold tracking-tight leading-tight text-slate-700 dark:text-slate-200">
                {tr("dashboard", item.key)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </DashCard>
  );
}
