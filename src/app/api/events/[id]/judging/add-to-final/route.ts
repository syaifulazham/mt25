import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const eventId = parseInt(params.id)
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { teamId, contestId } = body

    if (!teamId || !contestId) {
      return NextResponse.json(
        { error: 'Team ID and Contest ID are required' },
        { status: 400 }
      )
    }

    // Find the national event (scopeArea = 'NATIONAL')
    const nationalEvent = await prisma.event.findFirst({
      where: {
        scopeArea: 'NATIONAL'
      }
    })

    if (!nationalEvent) {
      return NextResponse.json(
        { error: 'No national event found' },
        { status: 404 }
      )
    }

    // Find the eventcontest for the national event with the same contestId
    const nationalEventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: nationalEvent.id,
        contestId: parseInt(contestId)
      }
    })

    if (!nationalEventContest) {
      return NextResponse.json(
        { error: 'Contest not found in national event' },
        { status: 404 }
      )
    }

    // Check if team is already registered
    const existingRegistration = await prisma.eventcontestteam.findFirst({
      where: {
        eventcontestId: nationalEventContest.id,
        teamId: parseInt(teamId)
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Team already registered for national finals' },
        { status: 409 }
      )
    }

    // Register team to national event contest
    const registration = await prisma.eventcontestteam.create({
      data: {
        eventcontestId: nationalEventContest.id,
        teamId: parseInt(teamId)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Team successfully added to national finals',
      registration,
      nationalEvent: {
        id: nationalEvent.id,
        name: nationalEvent.name
      }
    })

  } catch (error) {
    console.error('Failed to add team to final:', error)
    return NextResponse.json(
      { 
        error: 'Failed to add team to final',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
