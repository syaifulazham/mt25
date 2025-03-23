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
  
  // TEMPORARY: Development mode bypass to prevent redirect loops
  if (process.env.NODE_ENV === "development") {
    // Create a mock user for development
    const devUser = {
      id: 1,
      name: "Development User",
      email: "dev@techlympics.com",
      role: "ADMIN" as Role,
      username: "devuser"
    };
    
    return (
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <DashboardNav user={devUser} />

        {/* Main content */}
        <main className="flex-1 bg-background">
          <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black text-xs px-2 py-1 z-50 text-center">
            Development Mode: Authentication Bypassed
          </div>
          {children}
        </main>
      </div>
    );
  }
  
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // If no session, redirect to login
    if (!session || !session.user) {
      console.log("No session found, redirecting to login");
      return redirect("/organizer/auth/login?redirect=/organizer/dashboard");
    }
    
    // Check if user has organizer role
    const role = session.user.role;
    if (!role || !["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      console.log("User does not have organizer role, redirecting to login");
      return redirect("/organizer/auth/login?message=You+do+not+have+permission+to+access+the+organizer+portal");
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
  } catch (error) {
    // Handle JWT decryption errors gracefully
    console.error("Error in organizer layout:", error);
    
    // Clear any problematic cookies
    const cookiesToClear = ['next-auth.session-token', 'next-auth.csrf-token', 'next-auth.callback-url', 'techlympics-auth'];
    const cookieString = cookiesToClear.map(name => `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`).join('; ');
    
    // We can't directly set cookies in a server component, but we can add this to the response headers
    // This will be handled in middleware or on the next request
    
    return redirect("/organizer/auth/login?message=Session+expired+or+invalid");
  }
}
