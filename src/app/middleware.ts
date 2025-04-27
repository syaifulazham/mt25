// app/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get token from session
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // Skip middleware for auth routes to prevent redirect loops
  if (request.nextUrl.pathname.includes('/auth/')) {
    return NextResponse.next();
  }
  
  // Don't redirect if we're already on a login page
  if (request.nextUrl.pathname.endsWith('/login')) {
    return NextResponse.next();
  }
  
  // Determine the right login path based on route and environment
  let loginUrl;
  if (request.nextUrl.pathname.startsWith('/participants')) {
    // Participant routes
    loginUrl = process.env.NODE_ENV === 'production' 
      ? '/auth/login'
      : '/participants/auth/login';
  } else if (request.nextUrl.pathname.startsWith('/organizer')) {
    // Organizer routes
    loginUrl = process.env.NODE_ENV === 'production'
      ? '/auth/login'
      : '/organizer/auth/login';
  } else {
    // Default routes - don't redirect
    return NextResponse.next();
  }
  
  // Only redirect if we have a protected route and no token
  if (!token) {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }
  
  return NextResponse.next();
}

// Run middleware on all app routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};