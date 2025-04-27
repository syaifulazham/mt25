import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth-options";
import prisma from "@/lib/prisma";

// Explicitly mark this route as dynamic to fix the build error
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);
    
    // Get any user from the database for comparison
    const dbUsers = await prisma.user.findMany({
      take: 2,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    // Check cookies
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(';').map(c => c.trim()).filter(c => c);
    
    // Return debug information
    return NextResponse.json({
      session,
      hasCookies: cookies.length > 0,
      cookieCount: cookies.length,
      // Don't return actual cookie values for security, just names
      cookieNames: cookies.map(c => c.split('=')[0]),
      hasSessionCookie: cookies.some(c => c.startsWith('next-auth.session-token')),
      dbUserCount: dbUsers.length,
      dbUsers,
      headers: {
        userAgent: request.headers.get("user-agent"),
        host: request.headers.get("host"),
        referer: request.headers.get("referer"),
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL ? 'set' : 'not set',
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      }
    });
  } catch (error) {
    console.error("Session debug error:", error);
    return NextResponse.json({ 
      error: "Failed to retrieve session information", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
