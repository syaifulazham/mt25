/**
 * Utilities for debugging authentication issues
 * This file contains temporary code to help diagnose and fix login/redirect issues
 * It should be removed once the core issues are resolved
 */
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { user_role } from '@prisma/client';

// Make this interface match what's expected in getSessionUser return type
export interface EmergencyAuthUser {
  id: number;
  name: string;
  email: string;
  role: user_role;
  username: string | null;
  isParticipant?: boolean;
  // Additional required properties for type compatibility
  createdAt: Date;
  isActive: boolean;
  lastLogin: Date | null;
}

/**
 * Emergency bypass for authentication to help diagnose session issues
 * This function will check for a special debug cookie and return an admin user if present
 * This is a temporary solution until we fix the core session handling issues
 */
export async function getEmergencyAuthUser(): Promise<EmergencyAuthUser | null> {
  try {
    // Check for the debug cookie
    const cookieStore = cookies();
    const debugToken = cookieStore.get('emergency-auth-token')?.value;
    
    // If the debug cookie is not present, or not the expected value, return null
    if (!debugToken || debugToken !== process.env.EMERGENCY_AUTH_SECRET) {
      return null;
    }
    
    // Look up the admin user from the database
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        isActive: true
      }
    });
    
    if (!adminUser) {
      console.error('No admin user found for emergency auth');
      return null;
    }
    
    return {
      id: adminUser.id,
      name: adminUser.name || 'Admin User',
      email: adminUser.email,
      role: adminUser.role,
      username: adminUser.username,
      isParticipant: false,
      // Additional required properties for type compatibility
      createdAt: adminUser.createdAt,
      isActive: adminUser.isActive,
      lastLogin: adminUser.lastLogin
    };
  } catch (error) {
    console.error('Emergency auth error:', error);
    return null;
  }
}
