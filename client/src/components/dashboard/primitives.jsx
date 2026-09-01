import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dashCardClass =
  "h-full rounded-2xl border border-border/40 bg-card shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]";

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
          <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
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
    <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center rounded-xl bg-muted/40 px-5 py-8 text-center">
      {Icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      ) : null}
      <p className="max-w-[260px] text-sm font-semibold leading-relaxed text-foreground">
        {message}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SoftProgress({ value = 0, className, colorClass = "bg-primary" }) {
  const safe = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", colorClass)}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export function ChartTooltipBox({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const showLabel = Boolean(label) && payload.length > 1;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-md">
      {showLabel ? (
        <p className="mb-1.5 text-[11px] font-semibold text-foreground">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li
            key={entry.dataKey || entry.name}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color || entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {valueFormatter ? valueFormatter(entry.value, entry) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const sectionMotion = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};
