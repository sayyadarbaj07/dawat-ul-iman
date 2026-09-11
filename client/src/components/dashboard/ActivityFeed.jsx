import { Link } from "wouter";
import { Activity, ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { formatRs } from "@/hooks/useDashboardData";
import { toUrduDigits } from "@/utils/localizationUtils";
import { DashCard, DashEmpty, DashHeader } from "./primitives";

export function ActivityFeed({
  logs,
  transactions,
  events,
  meetings,
  canAccess,
}) {
  const { tr, language } = useLanguage();
  const locale = language === "ur" ? "ur-PK" : "en-GB";

  const logItems = (logs || []).map((log) => ({
    id: log._id,
    title: log.description || log.action,
    meta: log.username,
    date: log.createdAt,
    tone: "neutral",
    icon: Activity,
  }));

  const txItems = (transactions || []).map((tx) => ({
    id: tx._id,
    title: tx.description,
    meta: formatRs(tx.amount, language),
    date: tx.date,
    tone: tx.type === "income" ? "up" : "down",
    icon: tx.type === "income" ? ArrowDownRight : ArrowUpRight,
  }));

  const eventItems = (events || []).map((event) => ({
    id: event._id || event.id,
    title: event.title,
    meta: event.kind || event.type,
    date: event.date,
    tone: "neutral",
    icon: Calendar,
  }));

  const meetingItems = (meetings || []).map((meeting) => ({
    id: meeting._id,
    title: meeting.title,
    meta: meeting.time,
    date: meeting.date,
    tone: "neutral",
    icon: Calendar,
  }));

  let items = [];
  let titleKey = "recentActivity";
  let href = "/audit";

  if (logItems.length) {
    items = logItems;
    href = "/audit";
  } else if (txItems.length) {
    items = txItems;
    titleKey = "recentTransactions";
    href = "/finance";
  } else if (eventItems.length) {
    items = eventItems;
    titleKey = "upcomingThisWeek";
    href = "/calendar";
  } else if (meetingItems.length) {
    items = meetingItems;
    titleKey = "upcomingMeetings";
    href = "/meetings";
  }

  return (
    <DashCard className="flex flex-col">
      <DashHeader title={tr("dashboard", titleKey)} />
      <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {!items.length ? (
          <DashEmpty
            icon={Activity}
            message={tr("dashboard", "noActivity")}
            description={tr("dashboard", "noActivityHint")}
          />
        ) : (
          <ul className="flex-1 flex flex-col gap-1.5">
            {items.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3.5 rounded-[12px] px-2.5 py-2.5 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <div
                  className={cn(
                    "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]",
                    item.tone === "up"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : item.tone === "down"
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    {item.meta && (
                      <>
                        <span className="truncate max-w-[120px] inline-block align-bottom">{item.meta}</span>
                        <span className="opacity-50">•</span>
                      </>
                    )}
                    <span className="whitespace-nowrap">
                      {item.date
                        ? (() => {
                            const raw = new Date(item.date).toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                            });
                            return language === "ur" ? toUrduDigits(raw) : raw;
                          })()
                        : ""}
                      {item.date &&
                      (titleKey === "recentActivity" || titleKey === "recentTransactions")
                        ? (() => {
                            const raw = new Date(item.date).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return ` ${tr("dashboard", "at")} ${language === "ur" ? toUrduDigits(raw) : raw}`;
                          })()
                        : ""}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canAccess(href) && (
          <Button asChild variant="outline" className="mt-auto w-full min-h-[40px] rounded-[12px] border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition-all text-slate-700 dark:text-slate-300">
            <Link href={href}>{tr("common", "viewAll")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
