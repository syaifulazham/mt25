import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { TemplateService } from '@/lib/services/template-service'
import { templateUpdateSchema } from '@/lib/validations/template-schemas'

// Allowed roles for certificate templates management
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const template = await TemplateService.getTemplate(id)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    
    // Log incoming elements data for debugging
    if (body.configuration && body.configuration.elements) {
      const elements = body.configuration.elements;
      console.log(`Updating template with ${elements.length} elements`);
      
      // Log sample of properties we want to ensure are preserved
      const dynamicTextElements = elements.filter((el: any) => el.type === 'dynamic_text');
      if (dynamicTextElements.length > 0) {
        console.log('Sample dynamic text elements with prefix and text_anchor:', 
          dynamicTextElements.slice(0, 3).map((el: any) => ({
            id: el.id,
            prefix: el.prefix,
            text_anchor: el.text_anchor,
            style: el.style ? {
              align: el.style.align,
              font_family: el.style.font_family
            } : 'No style'
          }))
        );
      }
    }
    
    const validatedData = templateUpdateSchema.parse({ ...body, id })
    
    const template = await TemplateService.updateTemplate(id, {
      ...validatedData,
      updatedBy: userId,
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role 
    // Note: For deletion, we restrict to ADMIN only for safety
    if (!session?.user || !session.user.role || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access. Only administrators can delete templates.' },
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

    await TemplateService.deleteTemplate(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
