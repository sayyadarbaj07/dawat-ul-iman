import { Menu, Search, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import { formatHeaderDates } from "@/lib/utils";
import { getNavItemByPath } from "./nav";

export function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { language, setLanguage, languages, t, tr } = useLanguage();
  const [location] = useLocation();
  const currentNav = getNavItemByPath(location);
  const { islamic, gregorian } = formatHeaderDates(language);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 shadow-xs backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-muted-foreground lg:hidden"
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
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
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("appSubtitle")}
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">
            {tr("navigation", currentNav.key)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary xl:flex">
          <span className="max-w-[220px] truncate">{islamic}</span>
          <span className="mx-2 text-primary/30">·</span>
          <span className="text-primary/80">{gregorian}</span>
        </div>

        <div className="relative hidden w-48 lg:block xl:w-56">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            data-testid="input-search"
            className="h-9 border-border/80 bg-muted/40 ps-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              data-testid="button-language"
            >
              <Globe className="h-5 w-5" />
              <span className="sr-only">{t("language")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((item) => (
              <DropdownMenuItem
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={
                  language === item.code
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                {item.nativeLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border border-card bg-destructive" />
          <span className="sr-only">{t("notifications")}</span>
        </Button>

        {user && (
          <div className="hidden items-center gap-2 border-s border-border ps-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.initials}
            </div>
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-xs font-semibold text-foreground">
                {user.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user.roleLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
