import { Link } from "wouter";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  Landmark,
  BarChart3,
  Calendar,
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { DashCard, DashHeader } from "./primitives";

const ACTIONS = [
  { href: "/students", key: "addStudent", icon: Users },
  { href: "/teachers", key: "addTeacher", icon: GraduationCap },
  { href: "/attendance", key: "markAttendance", icon: CalendarCheck },
  { href: "/exams", key: "viewExams", icon: FileSpreadsheet },
  { href: "/finance", key: "newTransaction", icon: Landmark },
  { href: "/reports", key: "generateReport", icon: BarChart3 },
  { href: "/calendar", key: "viewCalendar", icon: Calendar },
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-11 flex-col items-center gap-2.5 rounded-xl bg-muted/40 px-2.5 py-3.5 text-center outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-primary/10 hover:shadow-sm active:duration-100 focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-border/50 transition-[transform,background-color,color] duration-200 ease-out group-hover:scale-[1.04] group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <span className="text-[12px] font-semibold leading-tight text-foreground">
                {tr("dashboard", item.key)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </DashCard>
  );
}
