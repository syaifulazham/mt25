import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'techlympics-2025-secret-key';
const COOKIE_NAME = 'techlympics-auth';

// Mock user for development
const MOCK_USER = {
  id: 1,
  name: 'Development User',
  email: 'dev@techlympics.com',
  role: 'ADMIN',
  username: 'devuser'
};

// Generate a token for the mock user
async function generateMockToken(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new jose.SignJWT({
    id: MOCK_USER.id,
    email: MOCK_USER.email,
    role: MOCK_USER.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Check if we need to clear cookies (from error redirect)
  if (request.nextUrl.searchParams.has('message') && 
      (request.nextUrl.searchParams.get('message')?.includes('Session+expired') || 
       request.nextUrl.searchParams.get('message')?.includes('Error+decrypting'))) {
    
    const response = NextResponse.redirect(request.nextUrl);
    
    // Clear problematic cookies
    const cookiesToClear = ['next-auth.session-token', 'next-auth.csrf-token', 'next-auth.callback-url', 'techlympics-auth'];
    cookiesToClear.forEach(name => {
      response.cookies.delete(name);
    });
    
    return response;
  }

  // Only run in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }

  // Skip middleware for auth-related paths and static assets
  if (
    request.nextUrl.pathname.includes('/api/auth') ||
    request.nextUrl.pathname.includes('/organizer/auth') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Check if the request already has the auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  
  // If the cookie exists, let the request proceed
  if (authCookie) {
    return NextResponse.next();
  }

  // For all routes without auth in development, add a mock auth cookie
  const token = await generateMockToken();
  const response = NextResponse.next();
  
  // Add the auth cookie to the response
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
  });

  // Also add the NextAuth session token for compatibility
  response.cookies.set({
    name: 'next-auth.session-token',
    value: token,
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
  });

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Skip auth routes and static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
