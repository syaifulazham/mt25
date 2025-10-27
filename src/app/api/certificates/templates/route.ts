import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { TemplateService } from '@/lib/services/certificate-service'
import { templateQuerySchema, templateCreateSchema } from '@/lib/validations/template-schemas'

// Allowed roles for certificate templates management
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      targetType: searchParams.get('targetType'),
    }

    // Validate parameters
    const validatedParams = templateQuerySchema.parse(queryParams)
    
    // Fetch templates
    const result = await TemplateService.listTemplates(validatedParams)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = templateCreateSchema.parse(body)
    
    // Get user ID from session
    const userId = parseInt(session.user.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Create template with user context
    const template = await TemplateService.createTemplate({
      ...validatedData,
      createdBy: userId,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
