import React from "react";
import { BackButton } from "@/components/ui/BackButton";

export function PageHeader({ 
  title, 
  description, 
  backLabel = "Back", 
  fallbackRoute = "/", 
  actions, 
  showBack = false 
}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
      <div className="flex items-start md:items-center gap-4">
        {showBack && (
          <BackButton label={backLabel} fallbackRoute={fallbackRoute} className="hidden sm:flex mt-1 md:mt-0 bg-white border border-slate-200 shadow-sm" />
        )}
        {showBack && (
          <BackButton label="" fallbackRoute={fallbackRoute} className="flex sm:hidden px-2 mt-1 bg-white border border-slate-200 shadow-sm" />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
