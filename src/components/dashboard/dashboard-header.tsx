import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string;
  description?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  description,
  children,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 pb-5", className)} {...props}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
