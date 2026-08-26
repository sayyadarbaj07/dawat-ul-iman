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
export function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-gray-500"
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="md:hidden">
          <BrandLogo
            className="text-gray-800"
            size="sm"
            textClassName="text-gray-800"
            imageClassName="object-contain"
          />
        </div>
      </div>

      <div className="hidden lg:flex">
        <BrandLogo
          className="text-gray-900"
          size="md"
          textClassName="text-gray-900"
          imageClassName="object-contain"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-md">
          19 Dhul Hijjah 1447 AH
        </div>

        <div className="relative hidden sm:block w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            data-testid="input-search"
            className="w-full bg-gray-50 pl-9 border-gray-200 focus-visible:ring-primary"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500"
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
          className="text-gray-500 relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-white" />
          <span className="sr-only">{t("notifications")}</span>
        </Button>

        {user && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="h-8 w-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold">
              {user.initials}
            </div>
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-xs font-semibold text-gray-700">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400">
                {user.roleLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
