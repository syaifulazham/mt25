import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'techlympics-2025-secret-key';
const COOKIE_NAME = 'techlympics-auth';
const SESSION_COOKIE = 'next-auth.session-token';

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
  // Skip auth pages to prevent redirect loops
  if (request.nextUrl.pathname.includes('/auth/')) {
    return NextResponse.next();
  }

  // Skip API routes and static assets
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }

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

  // Development mode authentication bypass
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_AUTH === 'true') {
    // Generate a new token if needed
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      const newToken = await generateMockToken();
      const response = NextResponse.next();
      
      // Set both cookies to ensure compatibility
      response.cookies.set({
        name: COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        path: '/',
        maxAge: 8 * 60 * 60, // 8 hours
      });
      
      // Also set the NextAuth session token for compatibility
      response.cookies.set({
        name: SESSION_COOKIE,
        value: newToken,
        httpOnly: true,
        path: '/',
        maxAge: 8 * 60 * 60, // 8 hours
      });
      
      return response;
    }
    
    return NextResponse.next();
  }

  // Production authentication handling
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = !!sessionToken;

  // Handle organizer routes
  if (request.nextUrl.pathname.startsWith('/organizer')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/organizer/auth/login', request.url));
    }
  }

  // Handle participant routes
  if (request.nextUrl.pathname.startsWith('/participants')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/participants/auth/login', request.url));
    }
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Skip static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
