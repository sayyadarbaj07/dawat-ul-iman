import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dashCardClass =
  "h-full rounded-[16px] sm:rounded-[18px] border border-slate-800/[0.06] dark:border-white/10 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.04)] transition-all duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.06)]";

export function DashCard({ className, children, ...props }) {
  return (
    <Card className={cn(dashCardClass, className)} {...props}>
      {children}
    </Card>
  );
}

export function DashHeader({ title, description, action, className }) {
  return (
    <CardHeader className={cn("space-y-1.5 p-6 pb-4 sm:p-7 sm:pb-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-base font-bold tracking-tight sm:text-lg text-foreground/90">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="text-[13px] leading-relaxed font-medium">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {action}
      </div>
    </CardHeader>
  );
}

export function DashEmpty({ icon: Icon, message, description, action }) {
  return (
    <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center rounded-[14px] bg-slate-50/50 dark:bg-slate-900/50 px-5 py-8 text-center border border-slate-100 dark:border-slate-800">
      {Icon ? (
        <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
      ) : null}
      <p className="max-w-[260px] text-[14.5px] font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
        {message}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-[260px] text-[13px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SoftProgress({ value = 0, className, colorClass = "bg-primary" }) {
  const safe = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div
      className={cn("h-[8px] sm:h-[10px] w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.2,0,0,1)]", colorClass)}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export function ChartTooltipBox({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const showLabel = Boolean(label) && payload.length > 1;

  return (
    <div className="rounded-[12px] border border-border/60 bg-card px-4 py-3 shadow-lg">
      {showLabel ? (
        <p className="mb-2 text-[12px] font-bold text-slate-600 dark:text-slate-400">{label}</p>
      ) : null}
      <ul className="space-y-1.5">
        {payload.map((entry) => (
          <li
            key={entry.dataKey || entry.name}
            className="flex items-center justify-between gap-5 text-[13px]"
          >
            <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color || entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {valueFormatter ? valueFormatter(entry.value, entry) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const sectionMotion = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

