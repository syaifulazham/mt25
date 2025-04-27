import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth-options";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";

// Explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);
    
    // Get cookie info
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Look for auth-related cookies
    const nextAuthCookies = allCookies.filter(c => 
      c.name.includes('next-auth') || 
      c.name.includes('csrf') ||
      c.name.includes('session')
    );
    
    // Check headers
    const headersList = headers();
    const headerEntries = Array.from(headersList.entries());
    
    // Get environment variables (redacted for security)
    const envVars = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL || 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set (redacted)' : 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set'
    };
    
    // Database checks
    let userCount = 0;
    let sampleUser = null;
    
    try {
      userCount = await prisma.user.count();
      if (userCount > 0) {
        sampleUser = await prisma.user.findFirst({
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true
          }
        });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }
    
    // Return comprehensive debug info
    return NextResponse.json({
      session,
      cookies: {
        count: allCookies.length,
        authCookies: nextAuthCookies.map(c => ({ 
          name: c.name, 
          path: c.path,
          secure: c.secure,
          sameSite: c.sameSite,
          // Don't show values for security
          hasValue: Boolean(c.value)
        }))
      },
      headers: {
        count: headerEntries.length,
        host: headersList.get('host'),
        userAgent: headersList.get('user-agent'),
        referer: headersList.get('referer')
      },
      environment: envVars,
      database: {
        connected: userCount > 0 ? 'yes' : 'no',
        userCount,
        sampleUserInfo: sampleUser ? {
          hasValidRole: Boolean(sampleUser.role),
          isActive: sampleUser.isActive,
          hasEmail: Boolean(sampleUser.email)
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Auth debug error:", error);
    return NextResponse.json({ 
      error: "Error getting debug information",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
