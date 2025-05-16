"use client";

import { TodayDate } from "./time-display";

// Client-side component for dashboard header with local time display
export default function DashboardHeader({ 
  userName 
}: { 
  userName: string 
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Welcome back, {userName || "User"}! Today is <TodayDate format="full" />
      </p>
    </div>
  );
}
