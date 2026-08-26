import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
import { API_BASE } from "@/lib/api/request";

export function BrandLogo({
  className,
  showName = true,
  size = "md",
  rounded = false,
  textClassName = "",
  imageClassName = "",
}) {
  const { settings } = useSettings();
  
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  };

  const getLogoUrl = () => {
    if (!settings || !settings.logoUrl) return "/logo1.jpeg";
    if (settings.logoUrl.startsWith("http")) return settings.logoUrl;
    if (settings.logoUrl.startsWith("/logo1")) return settings.logoUrl;
    
    // For uploaded logos, prepend backend URL
    const baseUrl = API_BASE.replace('/api', '');
    return `${baseUrl}${settings.logoUrl}`;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden shrink-0 border border-white/25 bg-white p-[2px] shadow-sm",
          rounded ? "rounded-full" : "rounded-lg",
          sizeClasses[size] || sizeClasses.md,
        )}
      >
        <img
          src={getLogoUrl()}
          alt={settings?.instituteName || "Dawat ul Iman logo"}
          className={cn("h-full w-full object-contain", imageClassName)}
        />
      </div>

      {showName ? (
        <div className="leading-tight min-w-0">
          <div
            className={cn(
              "font-bold tracking-wide text-sm sm:text-base",
              textClassName,
            )}
          >
            {settings?.instituteName || "Dawat ul Iman"}
          </div>
          <div
            className={cn(
              "text-[10px] sm:text-xs text-current/70",
              textClassName,
            )}
          >
            {settings?.instituteNameUrdu || "جامعہ دعوۃ الایمان"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
