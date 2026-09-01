import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        strokeWidth="2"
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
  trend,
  sparkline,
  className,
  delay = 0,
}) {
  return (
    <motion.div
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <Card
        className={cn(
          "group h-full rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md",
          className,
        )}
      >
        <CardContent className="flex h-full min-h-[140px] flex-col p-6 pt-7 sm:p-7 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <p className="pt-1 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            {icon && (
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-[1.08] shadow-sm",
                  iconClassName || "bg-primary/10 text-primary",
                )}
              >
                {React.cloneElement(icon, {
                  className: cn("h-[20px] w-[20px]", icon.props.className),
                  strokeWidth: 2,
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-2.5">
            <h3 className="text-4xl font-bold leading-none tracking-tight text-foreground tabular-nums">
              {value}
            </h3>
            {trend && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  trend.isPositive
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {trend.value}
              </span>
            )}
          </div>

          {subtitle ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground font-medium">
              {subtitle}
            </p>
          ) : null}
          <Sparkline data={sparkline} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

