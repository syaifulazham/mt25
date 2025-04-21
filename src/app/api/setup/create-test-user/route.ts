import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';

// This endpoint is for development purposes only
// It creates a test participant user for testing the participant platform
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    // Check if test participant already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        username: 'testparticipant',
      },
    });

    if (existingUser) {
      return NextResponse.json({ 
        message: 'Test participant user already exists', 
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          username: existingUser.username,
          role: existingUser.role,
        }
      });
    }

    // Create a test participant user
    const hashedPassword = await hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        name: 'Test Participant',
        email: 'testparticipant@example.com',
        username: 'testparticipant',
        password: hashedPassword,
        role: 'PARTICIPANT',
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Test participant user created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      loginInfo: {
        username: 'testparticipant',
        password: 'password123'
      }
    });
  } catch (error) {
    console.error('Error creating test participant user:', error);
    return NextResponse.json({ error: 'Failed to create test participant user' }, { status: 500 });
  }
}
