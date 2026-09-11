import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
export function ProgressBar({ value, label, showValue = true, className, colorClass = "bg-primary" }) {
    const safeValue = Math.min(Math.max(value, 0), 100);
    return (<div className={cn("w-full space-y-1.5", className)}>
      {(label || showValue) && (<div className="flex justify-between items-center text-sm">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {showValue && <span className="text-slate-500 font-medium">{safeValue}%</span>}
        </div>)}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50 shadow-inner">
        <motion.div className={cn("absolute top-0 left-0 bottom-0 rounded-full", colorClass)} initial={{ width: 0 }} animate={{ width: `${safeValue}%` }} transition={{ duration: 0.8, ease: "easeOut" }}/>
      </div>
    </div>);
}
