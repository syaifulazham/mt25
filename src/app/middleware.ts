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
  
  // Skip middleware for auth routes and login pages to prevent redirect loops
  // Be very explicit about auth path patterns to ensure they're always bypassed
  if (request.nextUrl.pathname.includes('/auth/') || 
      request.nextUrl.pathname.endsWith('/login') ||
      request.nextUrl.pathname.includes('/api/auth/')) {
    // Log for debugging
    console.log('Middleware: skipping auth route', request.nextUrl.pathname);
    return NextResponse.next();
  }
  
  // Determine the right login path based on route
  let loginUrl;
  if (request.nextUrl.pathname.startsWith('/participants')) {
    // Participant routes - use the new unified auth path
    loginUrl = '/auth/participants/login';
  } else if (request.nextUrl.pathname.startsWith('/organizer')) {
    // Organizer routes - use the new unified auth path
    loginUrl = '/auth/organizer/login';
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