import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
// @replit
// Whitespace-nowrap: Badges should never wrap.
"whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
    " hover-elevate ", {
    variants: {
        variant: {
            default: 
            // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
            "border-transparent bg-primary text-primary-foreground shadow-xs",
            secondary: 
            // @replit no hover because we use hover-elevate
            "border-transparent bg-secondary text-secondary-foreground",
            destructive: 
            // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
            "border-transparent bg-destructive text-destructive-foreground shadow-xs",
            // @replit shadow-xs" - use badge outline variable
            outline: "text-foreground border [border-color:var(--badge-outline)]",
            soft: "border-transparent bg-muted text-muted-foreground",
            "soft-success": "border-transparent bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            "soft-danger": "border-transparent bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            "soft-warning": "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            "soft-info": "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
function Badge({ className, variant, ...props }) {
    return (<div className={cn(badgeVariants({ variant }), className)} {...props}/>);
}
export { Badge, badgeVariants };
