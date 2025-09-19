# Certificate Management Authentication Implementation

This document explains how authentication is implemented in the Certificate Management module for the Techlympics platform.

## Authentication Approach

The Certificate Management module uses **NextAuth** for authentication, ensuring consistency with the rest of the organizer portal. This approach was chosen based on previous experience resolving authentication inconsistency issues in other modules.

### Role-Based Access Control

The module implements role-based access control with three roles:

| Role | Access Level |
|------|--------------|
| `ADMIN` | Full access (create, read, update, delete) |
| `OPERATOR` | Limited access (create, read, update) |
| `VIEWER` | Read-only access |

## Authentication Implementation

### API Routes

All API routes in the certificate management module use the same authentication pattern:

```typescript
// Example API route authentication implementation
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'

// Allowed roles for this operation
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'] // Adjusted based on operation sensitivity

export async function GET(request) {
  // Authenticate user using NextAuth
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated and has required role
  if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 403 }
    )
  }
  
  // Continue with authorized request processing
}
```

### Server Components

Server components use server-side authentication:

```typescript
// Example server component authentication
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { redirect } from 'next/navigation'

// Define allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']

export default async function CertificatePage() {
  // Get user session
  const session = await getServerSession(authOptions)
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect('/auth/organizer/login?callbackUrl=/organizer/certificates')
  }
  
  // Check if user has required role
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to dashboard if not authorized
    redirect('/organizer/dashboard')
  }
  
  // Render component for authorized users
}
```

### Client Components

Client components receive the session object from their parent server components and implement conditional rendering based on role:

```typescript
'use client'

interface ComponentProps {
  session: Session
}

export function CertificateComponent({ session }: ComponentProps) {
  // Check user role for conditional rendering
  const isAdmin = session.user.role === 'ADMIN'
  const canEdit = ['ADMIN', 'OPERATOR'].includes(session.user.role as string)
  
  return (
    <div>
      {/* Content visible to all authenticated users */}
      
      {/* Editing features only for ADMIN and OPERATOR */}
      {canEdit && (
        <button>Edit Certificate</button>
      )}
      
      {/* Admin-only features */}
      {isAdmin && (
        <button>Delete Certificate</button>
      )}
    </div>
  )
}
```

### Middleware

The Certificate Management module uses middleware for route protection:

```typescript
// Middleware for certificate routes
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: [
    '/organizer/certificates/:path*',
    '/api/certificates/:path*',
  ],
}

export async function middleware(req: NextRequest) {
  // Define allowed roles
  const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']
  
  // Get token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // Handle authentication and authorization
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  
  if (!token.role || !ALLOWED_ROLES.includes(token.role as string)) {
    return NextResponse.redirect(new URL('/organizer/dashboard', req.url))
  }
  
  // Handle role-specific access restrictions
  if (token.role !== 'ADMIN' && req.nextUrl.pathname.includes('/certificates/templates/create')) {
    return NextResponse.redirect(new URL('/organizer/certificates/templates', req.url))
  }
  
  return NextResponse.next()
}
```

## Role-Specific Operations

This table outlines the permissions for each certificate management operation:

| Operation | ADMIN | OPERATOR | VIEWER |
|-----------|-------|----------|--------|
| View template list | ✅ | ✅ | ✅ |
| View template details | ✅ | ✅ | ✅ |
| Create template | ✅ | ✅ | ❌ |
| Edit template | ✅ | ✅ | ❌ |
| Delete template | ✅ | ❌ | ❌ |
| Duplicate template | ✅ | ✅ | ❌ |
| Generate certificates | ✅ | ✅ | ❌ |
| View certificates | ✅ | ✅ | ✅ |
| Download certificates | ✅ | ✅ | ✅ |
| Send certificates | ✅ | ✅ | ❌ |

## Database Relations

The certificate models include user relations for audit purposes:

- `CertTemplate.createdBy` → Links to the user who created the template
- `CertTemplate.updatedBy` → Links to the user who last updated the template
- `Certificate.createdBy` → Links to the user who created the certificate

## Best Practices Implemented

1. **Consistent Authentication**: Using `getServerSession` across all components
2. **Clear Authorization Logic**: Role-based checks at both API and UI levels
3. **Middleware Protection**: Additional layer of security for all certificate routes
4. **Defensive Programming**: Fallback error handling for authentication failures
5. **Audit Trails**: Recording user IDs for all database operations

## Edge Cases Handled

1. **Session Expiration**: Proper redirection to login
2. **Role Changes**: Re-verification on each request
3. **Deep Linking**: Authentication checks on direct URL access
4. **API Protection**: All endpoints verify authentication and authorization
