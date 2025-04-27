import { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { user_role } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import React from "react";
import { getSessionUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Checks if there are any users in the system and creates an initial admin user if none exist
 */
async function initializeSystem() {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('No users found in database. Creating initial admin user...');
      
      // Call the system initialization API using relative URL that works in both environments
      const response = await fetch('/api/system/init', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success && !data.initialized) {
        console.log('Initial admin user created with credentials:');
        console.log(`Username: ${data.credentials.username}`);
        console.log(`Password: ${data.credentials.password}`);
        console.log('Please change this password after first login!');
      }
    }
  } catch (error) {
    console.error('Error initializing system:', error);
  }
}

export const metadata: Metadata = {
  title: "Organizer Portal | Techlympics 2025",
  description: "Administrator portal for Techlympics 2025 event management",
};

// Mark this layout as dynamic since it uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize system with admin user if needed
  await initializeSystem();
  
  // Get the current URL path from headers
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Skip authentication for auth routes - match environment-specific paths
  const authPathPattern = process.env.NODE_ENV === 'production'
    ? "/auth/"
    : "/organizer/auth/";
    
  if (pathname.includes(authPathPattern)) {
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
      role: "ADMIN" as user_role,
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
    // Get the current user without redirecting (middleware handles redirects for unauthenticated users)
    const user = await getSessionUser({ 
      redirectToLogin: false
    });
    
    // If no user, let middleware handle the redirect
    if (!user) {
      console.log("No user found, middleware will handle redirect");
      return null;
    }
    
    // Check if user has organizer role
    const role = (user as any).role;
    if (!role || !["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      console.log("User does not have organizer role, redirecting to login");
      // Use environment-specific login path
      const loginPath = process.env.NODE_ENV === 'production'
        ? "/auth/login"
        : "/organizer/auth/login";
      return redirect(`${loginPath}?message=You+do+not+have+permission+to+access+the+organizer+portal`);
    }
    
    // Convert user to the format expected by DashboardNav
    const dashboardUser = {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: (user as any).role as user_role,
      username: user.username || null
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
