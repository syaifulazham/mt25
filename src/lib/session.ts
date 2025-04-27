import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

// Export dynamic directive to prevent static generation issues
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * Options for getting the current user
 */
interface GetUserOptions {
  /** Whether to redirect to login page if not authenticated */
  redirectToLogin?: boolean;
}

/**
 * Gets the current authenticated user from the session
 * @param options Options for getting the current user
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser(options: GetUserOptions = { redirectToLogin: true }) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session from getServerSession:", session);

    if (!session || !session.user.email) {
      console.log("No valid session or email found");
      return null;
    }

    console.log("Looking up user with email:", session.user.email);
    console.log("Is participant flag from session:", session.user.isParticipant);

    // Check if the user is a participant
    const isParticipant = session.user.isParticipant;

    // Get user from appropriate database table
    let user;
    if (isParticipant) {
      user = await prisma.user_participant.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          ic: true,
          phoneNumber: true,
          gender: true,
          dateOfBirth: true,
          schoolId: true,
          higherInstId: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });
    } else {
      user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });
    }

    console.log("User from database:", user);

    // Update last login time
    if (user) {
      if (isParticipant) {
        await prisma.user_participant.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      }
    } else {
      console.log("User not found in database for email:", session.user.email);
    }

    // Add role and isParticipant to the user object
    if (user && isParticipant) {
      // Use type assertion to add properties to the user object
      (user as any).role = 'PARTICIPANTS_MANAGER';
      (user as any).isParticipant = true;
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Options for getting the session user
 */
interface GetSessionUserOptions {
  /** Whether to redirect to login page if not authenticated */
  redirectToLogin?: boolean;
  /** Custom login path to redirect to if not authenticated */
  loginPath?: string;
}

/**
 * Gets the current user with minimal DB queries (no lastLogin update)
 * Use this for frequent checks where performance is critical
 */
export async function getSessionUser(options: GetSessionUserOptions = { redirectToLogin: true }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.email) {
      console.log("No valid session or email found");
      
      // Handle redirection if requested
      if (options.redirectToLogin) {
        // Use environment-specific login paths
        let loginPath = options.loginPath;
        
        if (!loginPath) {
          // Get path from headers to determine which section we're in
          const headersList = headers();
          const currentPath = headersList.get("x-pathname") || "";
          
          // Route to the correct section login page using the new unified auth paths
          if (currentPath.startsWith('/organizer')) {
            loginPath = '/auth/organizer/login';
          } else {
            // Default to participants login
            loginPath = '/auth/participants/login';
          }
        }
        
        redirect(loginPath);
      }
      
      return null;
    }

    console.log("Looking up user with email:", session.user.email);
    console.log("Is participant flag from session:", session.user.isParticipant);

    // Check if the user is a participant
    const isParticipant = session.user.isParticipant;

    // Get user from appropriate database table
    let user;
    if (isParticipant) {
      user = await prisma.user_participant.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          ic: true,
          phoneNumber: true,
          gender: true,
          dateOfBirth: true,
          schoolId: true,
          higherInstId: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });
    } else {
      user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });
    }

    console.log("User from database:", user);

    // Add role and isParticipant to the user object
    if (user && isParticipant) {
      // Use type assertion to add properties to the user object
      (user as any).role = 'PARTICIPANTS_MANAGER';
      (user as any).isParticipant = true;
    }

    return user;
  } catch (error) {
    console.error("Error getting session user:", error);
    return null;
  }
}
