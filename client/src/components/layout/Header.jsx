import { useEffect, useState } from "react";
import { Menu, Search, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import { formatHeaderDates } from "@/lib/utils";
import { getNavItemByPath } from "./nav";
import { CommandPalette } from "./CommandPalette";
import { useUpcomingAlerts } from "@/hooks/useUpcomingAlerts";

export function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { language, setLanguage, languages, t, tr } = useLanguage();
  const [location, setLocation] = useLocation();
  const currentNav = getNavItemByPath(location);
  const { islamic, gregorian } = formatHeaderDates(language);
  const [commandOpen, setCommandOpen] = useState(false);
  const { alerts } = useUpcomingAlerts();
  const allowed = user ? ROLE_PERMISSIONS[user.role] || [] : [];
  const visibleAlerts = alerts.filter((item) => allowed.includes(item.href));

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[72px] w-full items-center justify-between gap-4 border-b border-border/40 bg-card/95 px-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] backdrop-blur-md md:px-8 transition-all duration-300">
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      <div className="flex min-w-0 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-muted-foreground transition-transform hover:scale-105 lg:hidden"
          data-testid="button-menu"
        >
          <Menu className="h-[22px] w-[22px]" />
          <span className="sr-only">{t("toggleSidebar")}</span>
        </Button>
        <div className="md:hidden">
          <BrandLogo
            className="text-foreground"
            size="sm"
            textClassName="text-foreground"
            imageClassName="object-contain"
          />
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            {t("appSubtitle")}
          </p>
          <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground">
            {tr("navigation", currentNav.key)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5">
        <div className="hidden items-center rounded-xl border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm xl:flex">
          <span className="max-w-[220px] truncate">{islamic}</span>
          <span className="mx-2.5 text-primary/30">·</span>
          <span className="text-primary/80">{gregorian}</span>
        </div>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          data-testid="input-search"
          className="relative hidden h-10 w-full items-center rounded-xl border border-border/50 bg-muted/30 px-3.5 text-start text-sm text-muted-foreground transition-all duration-300 hover:bg-muted/60 hover:shadow-sm lg:flex lg:w-64 xl:w-72"
        >
          <Search className="me-2.5 h-[18px] w-[18px] shrink-0 text-muted-foreground/70" />
          <span className="flex-1 truncate font-medium">{t("searchPlaceholder")}</span>
          <Kbd className="ms-2 hidden xl:inline-flex shadow-sm">Ctrl K</Kbd>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground transition-transform duration-300 hover:scale-105 lg:hidden"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-[20px] w-[20px]" />
          <span className="sr-only">{t("searchPlaceholder")}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground transition-transform duration-300 hover:bg-accent/50 hover:scale-105"
              data-testid="button-language"
            >
              <Globe className="h-[20px] w-[20px]" />
              <span className="sr-only">{t("language")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-border/40">
            {languages.map((item) => (
              <DropdownMenuItem
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={
                  language === item.code
                    ? "bg-primary/10 text-primary font-medium"
                    : "font-medium text-muted-foreground"
                }
              >
                {item.nativeLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground transition-transform duration-300 hover:bg-accent/50 hover:scale-105"
              data-testid="button-notifications"
            >
              <Bell className="h-[20px] w-[20px]" />
              {visibleAlerts.length > 0 && (
                <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border border-card bg-destructive shadow-sm" />
              )}
              <span className="sr-only">{t("notifications")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-lg border-border/40 p-1">
            <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 mb-1">
              {tr("dashboard", "upcomingThisWeek")}
            </div>
            {visibleAlerts.length === 0 ? (
              <div className="px-3 py-4 text-sm font-medium text-muted-foreground text-center">
                {tr("dashboard", "noNotifications")}
              </div>
            ) : (
              visibleAlerts.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => setLocation(item.href)}
                  className="flex flex-col items-start gap-1 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.days === 0
                      ? tr("dashboard", "today")
                      : item.days === 1
                        ? tr("dashboard", "tomorrow")
                        : tr("dashboard", "daysLeft", { count: item.days })}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {user && (
          <div className="hidden items-center gap-3 border-s border-border/40 ps-4 sm:flex transition-colors duration-300 hover:bg-muted/40 rounded-xl p-1.5 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 text-[13px] font-bold">
              {user.initials}
            </div>
            <div className="hidden flex-col leading-tight md:flex pe-1">
              <span className="text-[13px] font-bold tracking-tight text-foreground">
                {user.name}
              </span>
              <span className="text-[11px] font-medium capitalize tracking-wide text-muted-foreground/80 mt-0.5">
                {user.roleLabel ?? user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
