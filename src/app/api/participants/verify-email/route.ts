import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';

// Enable additional logging for debugging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    log('Verification request received with token:', token ? `${token.substring(0, 10)}...` : 'undefined');

    if (!token) {
      log('Verification failed: Token is missing');
      return NextResponse.json(
        { error: 'Verification token is missing' },
        { status: 400 }
      );
    }

    // Decode the token (format: userId:timestamp in base64)
    let decodedToken;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      log('Token decoded successfully:', decodedToken);
    } catch (error) {
      log('Failed to decode token:', error);
      return NextResponse.json(
        { error: 'Invalid verification token format' },
        { status: 400 }
      );
    }

    // Parse the decoded token
    const [userIdStr, timestampStr] = decodedToken.split(':');
    if (!userIdStr || !timestampStr) {
      log('Invalid token format - missing userId or timestamp', { userIdStr, timestampStr });
      return NextResponse.json(
        { error: 'Invalid verification token format' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);
    log('Parsed token data:', { userId, timestamp });

    // Check if token is expired (24 hours = 86400000 milliseconds)
    const expiryTime = timestamp + 86400000;
    const now = Date.now();
    const isExpired = now > expiryTime;
    log('Token expiry check:', { 
      now, 
      expiryTime, 
      isExpired,
      timeLeftMs: isExpired ? 0 : expiryTime - now
    });

    if (isExpired) {
      log('Verification failed: Token has expired');
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Find the user by ID
    log('Looking up user with ID:', userId);
    const user = await prisma.user_participant.findUnique({
      where: { id: userId }
    });

    if (!user) {
      log('Verification failed: User not found with ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    log('User found:', { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      isActive: user.isActive 
    });

    // If user is already active, return success
    if (user.isActive) {
      log('User is already active, no action needed');
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      );
    }

    // Update user to be active
    log('Activating user account...');
    await prisma.user_participant.update({
      where: { id: userId },
      data: { 
        isActive: true,
        updatedAt: new Date()
      }
    });

    log('Email verification successful for user:', userId);
    return NextResponse.json(
      { message: 'Email verification successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
