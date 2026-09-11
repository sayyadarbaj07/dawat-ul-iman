import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { dashCardClass } from "../dashboard/primitives";

function Sparkline({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 88;
  const h = 28;
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * w;
      const y = h - ((value - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 text-primary/50"
      width={w}
      height={h}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
  accentClassName,
  trend,
  sparkline,
  className,
  delay = 0,
}) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <Card
        className={cn("relative group", dashCardClass, className)}
      >
        <CardContent className="flex h-full flex-col p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 shrink">
              <p className="text-[11.5px] sm:text-[12px] lg:text-[13px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase leading-snug">
                {title}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-[24px] min-[400px]:text-[26px] sm:text-[28px] lg:text-[32px] font-[750] leading-none tracking-[-0.02em] text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                  {value}
                </h3>
              </div>
            </div>
            
            {icon && (
              <div
                className={cn(
                  "flex h-[44px] w-[44px] sm:h-[48px] sm:w-[48px] lg:h-[52px] lg:w-[52px] shrink-0 items-center justify-center rounded-[14px] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3",
                  iconClassName || "bg-primary/10 text-primary",
                )}
              >
                {React.cloneElement(icon, {
                  className: cn("h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] lg:h-[24px] lg:w-[24px]", icon.props.className),
                  strokeWidth: 2.5,
                })}
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 flex flex-col justify-end">
            <div className="flex items-center gap-2 flex-wrap">
              {trend && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11.5px] sm:text-[12px] font-bold tabular-nums shrink-0",
                    trend.isPositive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
                  )}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-[12px] sm:text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
            {sparkline && <Sparkline data={sparkline} />}
          </div>
        </CardContent>
        {/* Accent Line */}
        {accentClassName && (
          <div className={cn("absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full opacity-90", accentClassName)} />
        )}
      </Card>
    </motion.div>
  );
}

