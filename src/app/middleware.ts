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

  // Check if this is a participant route
  const isParticipantRoute = request.nextUrl.pathname.startsWith('/participants');
  
  // Exclude auth routes from redirection
  const isAuthRoute = request.nextUrl.pathname.includes('/auth/');
  
  if (isParticipantRoute && !isAuthRoute && !token) {
    // Redirect to login if no token and trying to access protected participant route
    // Check production vs development environment to handle URL correctly
    const loginUrl = process.env.NODE_ENV === 'production' 
      ? '/auth/login'
      : '/participants/auth/login';
    
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }
  
  return NextResponse.next();
}

// Only run middleware on participant routes except for auth routes
export const config = {
  matcher: ['/participants/:path*']
};