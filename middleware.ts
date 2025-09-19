import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Define certificate routes matcher
export const config = {
  matcher: [
    '/organizer/certificates/:path*',
    '/api/certificates/:path*',
  ],
}

/**
 * Middleware for certificate management routes
 * Handles authentication and authorization for both API and UI routes
 */
export async function middleware(req: NextRequest) {
  // Get the path
  const path = req.nextUrl.pathname

  // Get the user token
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Define allowed roles
  const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']
  
  // For API routes
  if (path.startsWith('/api/certificates')) {
    // API routes will handle their own authentication in route handlers
    return NextResponse.next()
  }
  
  // For UI routes
  if (path.startsWith('/organizer/certificates')) {
    // Check if user is authenticated
    if (!token) {
      // Redirect to login page if not authenticated
      const url = new URL('/auth/organizer/login', req.url)
      url.searchParams.set('callbackUrl', encodeURI(req.url))
      return NextResponse.redirect(url)
    }

    // Check if user has the required role
    if (!token.role || !ALLOWED_ROLES.includes(token.role as string)) {
      // Redirect to dashboard if not authorized
      return NextResponse.redirect(new URL('/organizer/dashboard', req.url))
    }

    // Check edit/create/delete permissions for non-admin users
    if (token.role !== 'ADMIN') {
      // Block create template access
      if (path.includes('/certificates/templates/create')) {
        return NextResponse.redirect(new URL('/organizer/certificates/templates', req.url))
      }
      
      // Block edit template access
      if (path.match(/\/certificates\/templates\/\d+\/edit/)) {
        return NextResponse.redirect(new URL('/organizer/certificates/templates', req.url))
      }
    }
  }

  // Allow access
  return NextResponse.next()
}
