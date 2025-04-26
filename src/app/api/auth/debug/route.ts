import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth-options';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    // Get environment variables (redacted for security)
    const envInfo = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✓ Set' : '✗ Not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Not set',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Not set',
    };
    
    // Return debug information
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      session: session ? {
        expires: session.expires,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          isParticipant: session.user.isParticipant,
        }
      } : null,
      environment: envInfo,
    }, { status: 200 });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'An error occurred while fetching auth debug information',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
