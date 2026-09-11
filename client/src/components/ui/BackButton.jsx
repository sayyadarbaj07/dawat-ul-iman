import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function BackButton({ onClick, fallbackRoute, className = "", label = "Back" }) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    if (window.history.length > 2) {
      window.history.back();
    } else if (fallbackRoute) {
      setLocation(fallbackRoute);
    } else {
      setLocation("/");
    }
  };

  return (
    <Button 
      variant="outline" 
      className={`group min-h-[44px] h-11 px-4 py-2 bg-white hover:bg-muted border border-border/80 shadow-sm text-foreground font-medium rounded-xl transition-all duration-200 hover:-translate-x-0.5 ${className}`} 
      onClick={handleBack}
      type="button"
    >
      <ArrowLeft className="w-[18px] h-[18px] me-2 text-muted-foreground group-hover:text-foreground transition-colors rtl:rotate-180" /> 
      {label}
    </Button>
  );
}
