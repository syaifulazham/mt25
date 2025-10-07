import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET handler to get certificate template for debugging
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
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

    // Get template directly from database
    const template = await prisma.certTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    // Log the full template configuration for debugging
    console.log('Template Configuration from Database:', JSON.stringify(template.configuration, null, 2))
    
    return NextResponse.json({
      template,
      // Include a processed version for comparison
      processedElements: template.configuration.elements.map((element: any) => ({
        id: element.id,
        type: element.type,
        text_anchor: element.text_anchor || 'DEFAULT-START',
        prefix: element.prefix !== undefined ? element.prefix : 'DEFAULT-EMPTY',
        style: element.style || {}
      }))
    })
  } catch (error) {
    console.error('Error fetching template for debugging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
