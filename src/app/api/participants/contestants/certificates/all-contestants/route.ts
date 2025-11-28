import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the participant
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email }
    })
    
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get all contingents managed by this participant
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id
      },
      select: {
        contingentId: true
      }
    })
    
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
      select: {
        id: true
      }
    })
    
    const contingentIds = [
      ...managedContingents.map(c => c.contingentId),
      ...legacyContingents.map(c => c.id)
    ]
    
    if (contingentIds.length === 0) {
      return NextResponse.json({ contestants: [] })
    }

    // Get all contestants from these contingents
    const contestants = await prisma.contestant.findMany({
      where: {
        contingentId: { in: contingentIds }
      },
      select: {
        id: true,
        name: true,
        ic: true,
        class_grade: true,
        class_name: true,
        contingent: {
          select: {
            name: true
          }
        },
        teamMembers: {
          select: {
            team: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const formattedContestants = contestants.map(contestant => ({
      id: contestant.id,
      name: contestant.name,
      ic: contestant.ic || '',
      class: contestant.class_grade || contestant.class_name || 'N/A',
      team: contestant.teamMembers[0]?.team.name || null,
      contingent: contestant.contingent?.name || 'N/A'
    }))

    return NextResponse.json({
      contestants: formattedContestants,
      total: formattedContestants.length
    })

  } catch (error) {
    console.error('Error fetching all contestants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contestants' },
      { status: 500 }
    )
  }
}
