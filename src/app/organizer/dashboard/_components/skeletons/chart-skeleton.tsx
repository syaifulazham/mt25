import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ChartSkeleton({ className = "h-[400px]" }: { className?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[250px]" />
      </CardHeader>
      <CardContent>
        <div className={className}>
          <div className="animate-pulse flex flex-col space-y-4 h-full">
            <Skeleton className="h-6 w-[180px]" />
            <div className="flex-1 bg-muted/30 rounded-md flex items-center justify-center">
              <svg className="w-12 h-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
