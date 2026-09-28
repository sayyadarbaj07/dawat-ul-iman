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
    <section className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-gradient-to-r from-[#064e3b] via-[#059669] to-[#022c22] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/10">
      {/* Subtle Premium Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      
      {/* Lighting Effects */}
      <div className="pointer-events-none absolute end-[-10%] top-[-20%] h-80 w-80 rounded-full bg-[#34D399] opacity-10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-30%] start-[-10%] h-72 w-72 rounded-full bg-[#059669] opacity-15 blur-[100px]" />

      {/* Official Header Strip - EXACT Letterhead Copy */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between bg-white rounded-[16px] px-6 py-5 sm:px-8 sm:py-6 mb-8 shadow-[0_8px_30px_rgba(255,255,255,0.15)] border border-white/40 ring-1 ring-emerald-500/20">
        
        {/* Left Section (English) */}
        <div className="flex flex-col text-center md:text-left flex-1 items-center md:items-start z-10 w-full md:w-[40%]">
          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 mb-0.5 w-full">
            <span className="text-[14px] sm:text-[16px] font-[900] text-[#1e3a8a] uppercase tracking-wider">JAMIA</span>
            <span className="text-[10px] sm:text-[11px] font-[700] text-black md:ml-auto md:mr-4">Reg.No.: F-0027800(BED)</span>
          </div>
          <span className="text-[28px] sm:text-[34px] lg:text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d81b60] via-[#8e24aa] to-[#d81b60] tracking-tighter uppercase leading-none mt-0 pb-1">
            DAWAT-UL-EIMAN
          </span>
          <span className="text-[10px] sm:text-[11px] font-[700] text-black mt-1 max-w-[280px] leading-tight">
            # 6 Minar Masjid, Roshanpura, Hazrat Balepeer, Beed<br/>431122 (MS)
          </span>
        </div>

        {/* Center Section (Emblem) */}
        <div className="flex-shrink-0 mx-2 my-4 md:my-0 z-10 relative flex justify-center w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] md:w-[20%]">
          <img src="/logo1.jpeg" alt="Jamia Dawat-ul-Iman Logo" className="w-full h-full object-contain mix-blend-multiply" />
        </div>

        {/* Right Section (Urdu) */}
        <div className="flex flex-col text-center md:text-right flex-1 items-center md:items-end z-10 w-full md:w-[40%]">
          <span className="text-[18px] sm:text-[22px] font-[900] text-[#1e3a8a] mb-[-10px] mr-1" dir="rtl">
            جامعه
          </span>
          <span className="text-[40px] sm:text-[50px] lg:text-[58px] font-black text-transparent bg-clip-text bg-gradient-to-l from-[#d81b60] via-[#8e24aa] to-[#d81b60] pb-1" dir="rtl" style={{ lineHeight: "1.2" }}>
            دعوة الايمان
          </span>
          <span className="text-[13px] sm:text-[14px] font-[700] text-black mt-0 max-w-[320px] leading-tight text-center md:text-right" dir="rtl">
            چھ مینار مسجد، روشن پورہ، حضرت بالے پیر بیڑ (مہاراشٹر)<br/>431122 (MS)
          </span>
        </div>
      </div>


      {/* Main Hero Content */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
        <div className="min-w-0 max-w-2xl space-y-7">
          
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60 mb-3">
              {t("appSubtitle")}
            </p>
            <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] font-[700] leading-tight tracking-tight text-white drop-shadow-sm">
              {tr("dashboard", "welcomeName", { name: userName })}
            </h1>
            <p className="text-[14px] sm:text-[15px] font-medium leading-relaxed text-white/80 max-w-[500px]">
              {tr("dashboard", "heroTagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md px-3.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-200/90" />
              {islamic}
            </span>
            <span className="inline-flex items-center rounded-full bg-black/20 border border-white/[0.05] px-3.5 py-1.5 text-[11.5px] font-medium text-white/90 backdrop-blur-sm">
              {gregorian}
            </span>
            {settings?.academicYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md px-3.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-200/90" />
                {tr("dashboard", "academicYear", { year: settings.academicYear })}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2 w-full sm:w-auto">
            {canAccess("/attendance") && (
              <Button
                asChild
                className="w-full sm:w-auto min-h-[46px] rounded-[14px] bg-white px-6 font-[600] text-emerald-900 shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition-all duration-[250ms] hover:bg-emerald-50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-[1px]"
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
                className="w-full sm:w-auto min-h-[46px] rounded-[14px] border border-white/20 bg-white/5 px-6 font-[600] text-white shadow-[0_4px_14px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-[250ms] hover:bg-white/10 hover:border-white/30 hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-[1px]"
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
          <div className="rounded-[20px] border border-white/[0.12] bg-white/[0.08] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-lg min-w-[220px] flex flex-col items-center justify-center transition-transform hover:scale-[1.02] duration-300">
            <BrandLogo
              className="text-white flex-col gap-3"
              size="lg"
              textClassName="text-white text-center text-[15px] font-bold tracking-wide drop-shadow-sm"
              imageClassName="object-contain drop-shadow-lg mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
