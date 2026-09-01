import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  Landmark,
  Home,
  Activity,
  UsersRound,
  Calendar,
  BarChart,
  Settings,
  ScrollText,
  UserCog,
} from "lucide-react";

export const NAV_GROUPS = [
  { id: "academic", labelKey: "groupAcademic" },
  { id: "operations", labelKey: "groupOperations" },
  { id: "admin", labelKey: "groupAdmin" },
];

export const NAV_ITEMS = [
  { href: "/", key: "dashboard", icon: LayoutDashboard, group: "academic" },
  { href: "/students", key: "students", icon: Users, group: "academic" },
  { href: "/teachers", key: "teachers", icon: GraduationCap, group: "academic" },
  { href: "/curriculum", key: "curriculum", icon: BookOpen, group: "academic" },
  { href: "/attendance", key: "attendance", icon: CalendarCheck, group: "academic" },
  { href: "/exams", key: "exams", icon: FileSpreadsheet, group: "academic" },
  { href: "/finance", key: "finance", icon: Landmark, group: "operations" },
  { href: "/hostel", key: "hostel", icon: Home, group: "operations" },
  { href: "/activities", key: "activities", icon: Activity, group: "operations" },
  { href: "/meetings", key: "meetings", icon: UsersRound, group: "operations" },
  { href: "/calendar", key: "calendar", icon: Calendar, group: "operations" },
  { href: "/reports", key: "reports", icon: BarChart, group: "operations" },
  { href: "/users", key: "users", icon: UserCog, group: "admin" },
  { href: "/promotions", key: "promotions", icon: GraduationCap, group: "admin" },
  { href: "/audit", key: "auditLogs", icon: ScrollText, group: "admin" },
  { href: "/settings", key: "settings", icon: Settings, group: "admin" },
];

export function getNavItemByPath(pathname) {
  return (
    NAV_ITEMS.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href)),
    ) || NAV_ITEMS[0]
  );
}
