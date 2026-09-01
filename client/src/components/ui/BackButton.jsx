import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function BackButton({ onClick, fallbackRoute, className = "", label = "Back" }) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onClick) {
      // For modals, dialogs, or custom state handling
      onClick();
      return;
    }
    
    // For full page routing: Check if we can safely go back in browser history
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
      variant="ghost" 
      className={`pl-2 pr-4 hover:bg-muted ${className}`} 
      onClick={handleBack}
      type="button"
    >
      <ArrowLeft className="w-4 h-4 mr-2" /> {label}
    </Button>
  );
}
