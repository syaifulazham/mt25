import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { prismaExecute } from '@/lib/prisma';

/**
 * API route to initialize system with an admin user if none exists
 * This ensures that the /organizer modules can be accessed on first-time setup
 */
export async function GET(request: NextRequest) {
  try {
    // Check if any users exist using prismaExecute for connection management
    const userCount = await prismaExecute(prisma => prisma.user.count());
    
    if (userCount === 0) {
      console.log('No users found in database. Creating initial admin user...');
      
      // Create default admin credentials
      const defaultUsername = 'admin';
      const defaultPassword = 'Techlympics2025!'; // This should be changed after first login
      const defaultEmail = 'admin@techlympics.my';
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Create the admin user using prismaExecute for connection management
      const adminUser = await prismaExecute(prisma => prisma.user.create({
        data: {
          username: defaultUsername,
          password: hashedPassword,
          email: defaultEmail,
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
          updatedAt: new Date(),
        }
      }));
      
      return NextResponse.json({
        success: true,
        message: 'Initial admin user created successfully',
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role
        },
        credentials: {
          username: defaultUsername,
          password: defaultPassword
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'System already initialized with an admin user',
        userCount
      });
    }
  } catch (error) {
    console.error('Error initializing system:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
