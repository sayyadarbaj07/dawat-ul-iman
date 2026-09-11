import { Link } from "wouter";
import { CalendarCheck, CalendarDays, GraduationCap, Users } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { formatHeaderDates } from "@/lib/utils";

export function DashboardHero({ userName, canAccess }) {
  const { t, tr, language } = useLanguage();
  const { settings } = useSettings();
  const { islamic, gregorian } = formatHeaderDates(language);

  return (
    <section className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8 lg:px-10 lg:py-8">
      {/* Subtle Premium Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
      
      {/* Lighting Effects */}
      <div className="pointer-events-none absolute end-[-10%] top-[-20%] h-64 w-64 rounded-full bg-[#34D399] opacity-10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[-30%] start-[-10%] h-56 w-56 rounded-full bg-[#059669] opacity-20 blur-[80px]" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-2xl space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100/70">
            {t("appSubtitle")}
          </p>
          <div className="space-y-2">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight sm:text-[28px] lg:text-[32px]">
              {tr("dashboard", "welcomeName", { name: userName })}
            </h1>
            <p className="max-w-lg text-[14px] leading-relaxed text-emerald-50/80 sm:text-[15px]">
              {tr("dashboard", "heroTagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-sm border border-white/10">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-200" />
              {islamic}
            </span>
            <span className="rounded-full bg-black/20 px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-sm border border-black/10">
              {gregorian}
            </span>
            {settings?.academicYear ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-sm border border-white/10">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-200" />
                {tr("dashboard", "academicYear", { year: settings.academicYear })}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 pt-1 w-full sm:w-auto">
            {canAccess("/attendance") && (
              <Button
                asChild
                className="w-full sm:w-auto min-h-[44px] rounded-[12px] bg-white px-5 font-bold text-emerald-950 shadow-[0_4px_14px_0_rgba(255,255,255,0.25)] transition-all duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)] hover:bg-emerald-50 hover:shadow-[0_6px_20px_rgba(255,255,255,0.3)] hover:-translate-y-[2px]"
              >
                <Link href="/attendance">
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  {tr("dashboard", "markAttendance")}
                </Link>
              </Button>
            )}
            {canAccess("/students") && (
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto min-h-[44px] rounded-[12px] border-white/20 bg-white/5 px-5 font-bold text-white shadow-none backdrop-blur-sm transition-all duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)] hover:bg-white/15 hover:border-white/30 hover:-translate-y-[2px]"
              >
                <Link href="/students">
                  <Users className="h-4 w-4 mr-2" />
                  {tr("dashboard", "addStudent")}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 lg:block">
          <div className="rounded-[16px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-md max-w-[200px]">
            <BrandLogo
              className="text-white flex-col gap-2"
              size="sm"
              textClassName="text-white text-center text-sm"
              imageClassName="object-contain drop-shadow-md mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
