import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No data found", 
  description = "There are no records to display at this time.", 
  actionLabel, 
  onAction,
  className = ""
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm ${className}`}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
