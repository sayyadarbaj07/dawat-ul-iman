import { useEffect, useState } from "react";
import { Menu, Search, Bell, Globe, Info, CheckCircle2, AlertTriangle, AlertCircle, X, Check } from "lucide-react";
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
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { language, setLanguage, languages, t, tr } = useLanguage();
  const [location, setLocation] = useLocation();
  const currentNav = getNavItemByPath(location);
  const { islamic, gregorian } = formatHeaderDates(language);
  const [commandOpen, setCommandOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();

  const getIconForType = (type) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "alert": return <Bell className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

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
              {unreadCount > 0 && (
                <span className="absolute end-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-destructive text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">{t("notifications")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-lg border-border/40 p-1">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                {t("notifications")}
              </span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary/80"
                >
                  {tr("common", "markAllAsRead")}
                </Button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto overflow-x-hidden">
              {loading && notifications.length === 0 ? (
                <div className="px-3 py-6 text-sm font-medium text-muted-foreground text-center flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent me-2" />
                  {tr("common", "loading")}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-3 py-6 text-sm font-medium text-muted-foreground text-center">
                  {tr("dashboard", "noNotifications")}
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item._id}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors relative ${item.isRead ? "opacity-75 hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getIconForType(item.type)}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (!item.isRead) markAsRead(item._id);
                        if (item.link) setLocation(item.link);
                      }}
                    >
                      <p className={`text-sm ${item.isRead ? "font-medium" : "font-bold text-foreground"} leading-tight`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground/70 mt-1.5">
                        {language === "en" 
                          ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) 
                          : `${new Intl.DateTimeFormat("ur-PK", { day: "numeric", month: "short" }).format(new Date(item.createdAt))} · ${new Intl.DateTimeFormat("ur-PK", { hour: "numeric", minute: "numeric" }).format(new Date(item.createdAt))} ${tr("dashboard", "at")}`
                        }
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); markAsRead(item._id); }}
                          title={tr("common", "markAsRead")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); deleteNotification(item._id); }}
                        title={tr("common", "delete")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
