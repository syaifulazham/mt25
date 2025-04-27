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
    
    // Log for debugging in production
    console.log("Organizer layout - user check:", !!user);
    
    // If no user, show a fallback with login link instead of returning null
    if (!user) {
      console.log("No user found, showing fallback login link");
      // Use environment-specific login path
      const loginPath = process.env.NODE_ENV === 'production'
        ? "/auth/login"
        : "/organizer/auth/login";
        
      return (
        <div className="flex min-h-screen">
          <main className="flex-1 bg-background flex items-center justify-center">
            <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-md">
              <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
              <p className="mb-6">You need to log in to access the organizer portal.</p>
              <a 
                href={loginPath}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </a>
            </div>
          </main>
        </div>
      );
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
    console.error("Error in organizer layout:", error);
    
    // Show error UI instead of returning null
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-md border-red-500 border-2">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
            <p className="mb-6">An error occurred while loading the organizer portal.</p>
            <p className="text-sm text-gray-600 mb-4">
              Error details: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <a 
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Home
            </a>
          </div>
        </main>
      </div>
    );
  }
}
