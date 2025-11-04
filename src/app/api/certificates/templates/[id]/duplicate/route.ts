import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { TemplateService } from '@/lib/services/template-service'
import { checkTemplateAccess } from '@/lib/validations/template-schemas'

// Allowed roles for duplicating certificate templates
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user has required role using our helper
    if (!checkTemplateAccess('create', session.user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to duplicate templates' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    // Get user ID from session for audit trail
    const userId = parseInt(session.user.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Parse custom configuration from request body (optional)
    let customConfig = undefined
    try {
      const body = await request.json().catch(() => ({}))
      if (body && Object.keys(body).length > 0) {
        customConfig = {
          templateName: body.templateName,
          targetType: body.targetType,
          eventId: body.eventId !== undefined ? (body.eventId === null ? null : parseInt(body.eventId)) : undefined,
          quizId: body.quizId !== undefined ? (body.quizId === null ? null : parseInt(body.quizId)) : undefined,
          winnerRangeStart: body.winnerRangeStart !== undefined ? (body.winnerRangeStart === null ? null : parseInt(body.winnerRangeStart)) : undefined,
          winnerRangeEnd: body.winnerRangeEnd !== undefined ? (body.winnerRangeEnd === null ? null : parseInt(body.winnerRangeEnd)) : undefined,
          prerequisites: body.prerequisites
        }
      }
    } catch (error) {
      // Ignore JSON parse errors - proceed with default duplication
      console.log('No custom config provided, using defaults')
    }

    // Call template service to duplicate the template
    const duplicatedTemplate = await TemplateService.duplicateTemplate(id, userId, customConfig)

    // Return the duplicated template
    return NextResponse.json({ 
      success: true,
      template: duplicatedTemplate,
      message: 'Template duplicated successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to duplicate template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { error: 'Failed to duplicate template', details: errorMessage },
      { status: 500 }
    )
  }
}
