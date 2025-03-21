import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/**
 * Gets the current authenticated user from the session
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session from getServerSession:", session);
    
    // Not authenticated
    if (!session?.user?.email) {
      console.log("No valid session or email found");
      return null;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
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
      },
    });

    console.log("User from database:", user);

    // Update last login time
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } else {
      console.log("User not found in database for email:", session.user.email);
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Gets the current user with minimal DB queries (no lastLogin update)
 * Use this for frequent checks where performance is critical
 */
export async function getSessionUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
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
      },
    });

    return user;
  } catch (error) {
    console.error("Error getting session user:", error);
    return null;
  }
}
