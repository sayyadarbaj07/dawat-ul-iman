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
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(152,38%,36%)] via-primary to-[hsl(152,52%,18%)] px-5 py-7 text-primary-foreground shadow-md sm:px-8 sm:py-9 lg:px-10 lg:py-11">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_end,rgba(255,255,255,0.16),transparent_46%)]" />
      <div className="pointer-events-none absolute end-[-12%] top-[-30%] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-28%] start-[-8%] h-48 w-48 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="min-w-0 max-w-2xl space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
            {t("appSubtitle")}
          </p>
          <div className="space-y-2.5">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.15rem] lg:text-4xl">
              {tr("dashboard", "welcomeName", { name: userName })}
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-primary-foreground/80 sm:text-[15px]">
              {tr("dashboard", "heroTagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium">
              <CalendarDays className="h-3.5 w-3.5 opacity-80" />
              {islamic}
            </span>
            <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-medium">
              {gregorian}
            </span>
            {settings?.academicYear ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium">
                <GraduationCap className="h-3.5 w-3.5 opacity-80" />
                {tr("dashboard", "academicYear", { year: settings.academicYear })}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {canAccess("/attendance") && (
              <Button
                asChild
                className="h-10 rounded-xl bg-white px-4 font-semibold text-primary shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-white/92 hover:shadow-md"
              >
                <Link href="/attendance">
                  <CalendarCheck className="h-4 w-4" />
                  {tr("dashboard", "markAttendance")}
                </Link>
              </Button>
            )}
            {canAccess("/students") && (
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-white/25 bg-white/5 px-4 font-semibold text-primary-foreground shadow-none transition-[background-color,box-shadow] duration-200 hover:bg-white/12"
              >
                <Link href="/students">
                  <Users className="h-4 w-4" />
                  {tr("dashboard", "addStudent")}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-sm">
            <BrandLogo
              className="text-primary-foreground"
              size="lg"
              textClassName="text-primary-foreground"
              imageClassName="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
