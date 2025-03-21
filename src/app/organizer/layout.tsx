import { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import React from "react";

export const metadata: Metadata = {
  title: "Organizer Portal | Techlympics 2025",
  description: "Administrator portal for Techlympics 2025 event management",
};

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current URL path from headers
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Skip authentication for auth routes
  if (pathname.includes("/organizer/auth/")) {
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    );
  }
  
  // Get the session
  const session = await getServerSession(authOptions);
  
  // If no session, redirect to login
  if (!session || !session.user) {
    redirect("/organizer/auth/login?redirect=/organizer/dashboard");
  }
  
  // Check if user has organizer role
  const role = session.user.role;
  if (!role || !["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
    redirect("/organizer/auth/login?message=You+do+not+have+permission+to+access+the+organizer+portal");
  }
  
  // Convert session user to the format expected by DashboardNav
  const dashboardUser = {
    id: parseInt(session.user.id),
    name: session.user.name || "",
    email: session.user.email || "",
    role: session.user.role as Role,
    username: session.user.username || null
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <DashboardNav user={dashboardUser} />

      {/* Main content */}
      <main className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}
