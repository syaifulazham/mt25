import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClass = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    }[size];

    return (
      <div
        ref={ref}
        className={cn("animate-spin text-muted-foreground", sizeClass, className)}
        {...props}
      >
        <Loader2 className="h-full w-full" />
      </div>
    );
  }
);

Spinner.displayName = "Spinner";
