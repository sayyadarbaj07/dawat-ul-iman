import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function StatCard({ title, value, subtitle, icon, trend, className, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 350, damping: 30, delay }}
    >
      <Card className={cn("overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-300 group bg-card/50 backdrop-blur-sm", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground tracking-tight">{title}</p>
              <div className="flex items-center gap-2">
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
                {trend && (
                  <span className={cn(
                    "text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex items-center", 
                    trend.isPositive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}>
                    {trend.value}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground/80">{subtitle}</p>}
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-sm">
              {React.cloneElement(icon, { className: cn("h-5 w-5", icon.props.className) })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
