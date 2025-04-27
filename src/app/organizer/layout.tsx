import { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { user_role } from "@prisma/client";
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
    // AUTHENTICATION BYPASS: For development/testing only
    console.log("AUTH BYPASS ENABLED: Skipping authentication checks");
    
    // Create a mock admin user for the dashboard
    const mockAdminUser = {
      id: 999, // Must be a number to match AuthUser interface
      name: "Development User",
      email: "dev@example.com",
      role: "ADMIN" as user_role, // Properly typed
      username: "admin"
    };
    
    // Note: In a real environment, we would check authentication:
    /*
    const user = await getSessionUser({ 
      redirectToLogin: false
    });
    
    // If no user, redirect to login
    if (!user) {
      console.log("No user found, redirecting to login");
      const loginPath = "/organizer/auth/login";
      return redirect(`${loginPath}?redirect=${encodeURIComponent(currentPath)}`);
    }
    
    // Check if user has organizer role
    const role = (user as any).role;
    if (!role || !["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      console.log("User does not have organizer role, redirecting to login");
      const loginPath = "/organizer/auth/login";
      return redirect(`${loginPath}?message=You+do+not+have+permission+to+access+the+organizer+portal`);
    }
    */
    
    // Use our mock admin user for the dashboard
    const dashboardUser = mockAdminUser;
    
    return (
      <div className="flex min-h-screen">
        <DashboardNav user={dashboardUser} />
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    );
  } catch (error) {
    // Show error UI for authentication failures
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
