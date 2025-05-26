import { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import MobileMenu from "@/components/dashboard/mobile-menu";
import { user_role } from "@prisma/client";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import React from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getEmergencyAuthUser } from "@/lib/auth-debug";
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
      
      // Call the system initialization API using absolute URL constructed from headers
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/system/init`, {
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

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is an auth route to bypass authentication
  const currentPath = getPathFromHeaders();
  
  // Critical: auth routes bypass the standard layout to avoid redirect loops
  if (currentPath.includes("/organizer/auth/")) {
    return children;
  }
  
  // For non-auth routes, initialize system (don't await it)
  void initializeSystem();
  
  // Return a JSX promise for authenticated content
  // This is the proper way to handle async operations in React Server Components
  return AuthenticatedContent({ children, currentPath });
}

// Helper function to get path from headers
function getPathFromHeaders(): string {
  try {
    const headersList = headers();
    return headersList.get("x-pathname") || "/organizer";
  } catch (e) {
    console.error("Error reading headers:", e);
    return "/organizer";
  }
}

// Async component for authenticated content
async function AuthenticatedContent({ 
  children, 
  currentPath 
}: { 
  children: React.ReactNode, 
  currentPath: string 
}) {
  try {
    console.log('NEXTAUTH ENV VARIABLES:', {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    });
    
    // Try to get the user from the standard session first
    console.log("Fetching user session for path:", currentPath);
    let user = await getSessionUser({ 
      redirectToLogin: false
    });
    
    console.log("Session check result:", user ? 'User found' : 'No user');
    
    // If no user from regular session, try emergency auth
    if (!user) {
      console.log("No user from session, trying emergency auth...");
      const emergencyUser = await getEmergencyAuthUser();
      
      if (emergencyUser) {
        console.log("Emergency user found, bypassing normal auth");
        // Cast to any to bypass TypeScript issues with the exact user structure
        user = emergencyUser as any;
      } else {
        console.log("No user found via any method, redirecting to login");
        const loginPath = "/auth/organizer/login";
        return redirect(`${loginPath}?redirect=${encodeURIComponent(currentPath)}`);
      }
    }
    
    // Ensure user is now defined (either from session or emergency auth)
    if (!user) {
      // This should never happen due to the checks above, but TypeScript needs this
      console.error("Critical error: User is still null after all auth checks");
      const loginPath = "/auth/organizer/login";
      return redirect(`${loginPath}?error=Critical+authentication+error`);
    }

    // Log full user information to debug session issues
    console.log("Authenticated user:", JSON.stringify(user, null, 2));
    
    // Check if user has organizer role
    const role = (user as any).role;
    console.log("User role:", role);
    
    if (!role || !["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      console.log("User does not have organizer role, redirecting to login");
      const loginPath = "/auth/organizer/login";
      return redirect(`${loginPath}?message=You+do+not+have+permission+to+access+the+organizer+portal`);
    }
    
    // Note: We're only restricting navigation menu for VIEWER users, not enforcing page access restrictions
    // VIEWER users will only see the Dashboard in the menu, but can technically access other pages if they know the URL
    console.log("User role is", role, "- menu restrictions will be applied in the component");
    
    // User is authenticated and has correct role
    const dashboardUser = {
      id: user.id,
      name: typeof user.name === 'string' ? user.name : "",
      email: typeof user.email === 'string' ? user.email : "",
      role: (user as any).role as user_role,
      username: user.username || null
    };
    
    return (
      <div className="min-h-screen">
        {/* Mobile Header - Only visible on small screens */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border">
            <Link href="/organizer/dashboard" className="flex items-center">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                TECHLYMPICS
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-sidebar-foreground">{dashboardUser.name}</span>
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
                {dashboardUser.name.charAt(0)}
              </div>
              <MobileMenu user={dashboardUser} />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="flex">
          <DashboardNav user={dashboardUser} />
          <main className="flex-1 bg-background w-full">
            {children}
          </main>
        </div>
      </div>
    );
  } catch (error) {
    // Check if the error is a Next.js redirect
    const isRedirectError = 
      error instanceof Error && 
      (error.message === 'NEXT_REDIRECT' || error.message.includes('redirect'));
    
    // If it's a redirect error, handle it differently
    if (isRedirectError) {
      // For redirect errors, just show a simple message with links to safe pages
      return (
        <div className="flex min-h-screen">
          <main className="flex-1 bg-background flex items-center justify-center">
            <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-md border-orange-500 border-2">
              <h1 className="text-2xl font-bold mb-4 text-orange-600">Access Restricted</h1>
              <p className="mb-6">You don't have permission to access this section.</p>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <a 
                  href="/organizer/dashboard"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Go to Dashboard
                </a>
                <a 
                  href="/"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Return to Home
                </a>
              </div>
            </div>
          </main>
        </div>
      );
    }
    
    // For other errors, show detailed error information
    return (
      <div className="flex min-h-screen">
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-md border-red-500 border-2">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
            <p className="mb-6">An error occurred while loading the organizer portal.</p>
            <p className="text-sm text-gray-600 mb-4">
              Error details: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <a 
                href="/organizer/dashboard"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Dashboard
              </a>
              <a 
                href="/"
                className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Go to Home
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }
}
