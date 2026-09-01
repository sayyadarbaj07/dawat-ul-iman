import { Link } from "wouter";
import { Activity, ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { formatRs } from "@/hooks/useDashboardData";
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
    meta: formatRs(tx.amount),
    date: tx.date,
    tone: tx.type === "income" ? "up" : "down",
    icon: tx.type === "income" ? ArrowUpRight : ArrowDownRight,
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
          <ul className="flex-1 space-y-0.5">
            {items.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    item.tone === "up"
                      ? "bg-primary/10 text-primary"
                      : item.tone === "down"
                        ? "bg-gold/10 text-gold"
                        : "bg-muted text-primary",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.meta ? `${item.meta} · ` : ""}
                    {item.date
                      ? new Date(item.date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                    {item.date &&
                    (titleKey === "recentActivity" || titleKey === "recentTransactions")
                      ? ` · ${new Date(item.date).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canAccess(href) && (
          <Button asChild variant="outline" size="sm" className="mt-auto w-full rounded-xl">
            <Link href={href}>{tr("common", "viewAll")}</Link>
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
