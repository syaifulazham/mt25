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
  // Only run in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }

  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if the request already has the auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  
  // If the cookie exists, let the request proceed
  if (authCookie) {
    return NextResponse.next();
  }

  // For API routes without auth, add a mock auth cookie
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

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
