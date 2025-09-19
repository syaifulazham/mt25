import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Allowed roles for accessing certificate routes
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

/**
 * Middleware to protect certificate routes
 * This middleware checks if the user has the required role to access certificate pages
 */
export async function certificateMiddleware(req: NextRequest) {
  // Get the path
  const path = req.nextUrl.pathname

  // Only run middleware for certificate routes
  if (!path.startsWith('/organizer/certificates')) {
    return NextResponse.next()
  }

  // Get the user token
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET 
  })

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

  // Allow access
  return NextResponse.next()
}
