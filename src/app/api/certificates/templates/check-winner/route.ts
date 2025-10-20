import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventIdParam = searchParams.get('eventId')

    if (!eventIdParam) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const eventId = parseInt(eventIdParam)
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // Check if any winner templates exist for this event
    const winnerTemplates = await prisma.certTemplate.findMany({
      where: {
        eventId: eventId,
        targetType: 'EVENT_WINNER',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        templateName: true
      }
    })

    return NextResponse.json({
      hasTemplates: winnerTemplates.length > 0,
      count: winnerTemplates.length,
      templates: winnerTemplates
    })

  } catch (error) {
    console.error('Failed to check winner templates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check winner templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
