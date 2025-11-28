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
            id: true,
            name: true
          }
        },
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
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

    // For each contestant, fetch their SCHOOL_WINNER certificate using raw query
    const contestantsWithCertificates = await Promise.all(
      contestants.map(async (contestant) => {
        // Find SCHOOL_WINNER certificate for this contestant
        const certificates = await prisma.$queryRaw<Array<{
          id: number
          templateId: number
          recipientName: string
          filePath: string | null
          uniqueCode: string
          ownership: any
          templateName: string
          targetType: string
        }>>`
          SELECT 
            c.id,
            c.templateId,
            c.recipientName,
            c.filePath,
            c.uniqueCode,
            c.ownership,
            ct.templateName,
            ct.targetType
          FROM certificate c
          INNER JOIN cert_template ct ON c.templateId = ct.id
          WHERE c.status = 'READY'
            AND c.ic_number = ${contestant.ic}
            AND ct.targetType = 'SCHOOL_WINNER'
        `

        const certificate = certificates.length > 0 ? certificates[0] : null

        return {
          id: contestant.id,
          contestantId: contestant.id, // Using id as contestantId
          name: contestant.name,
          ic: contestant.ic || '',
          class: contestant.class_grade || contestant.class_name || 'N/A',
          team: contestant.teamMembers[0]?.team.name || null,
          teamId: contestant.teamMembers[0]?.team.id || null,
          contingent: contestant.contingent?.name || 'N/A',
          schoolWinnerCertificate: certificate ? {
            id: certificate.id,
            templateName: certificate.templateName,
            targetType: certificate.targetType,
            filePath: certificate.filePath,
            uniqueCode: certificate.uniqueCode
          } : null
        }
      })
    )

    // Filter to only include contestants who have school winner certificates
    const winnersOnly = contestantsWithCertificates.filter(c => c.schoolWinnerCertificate !== null)

    return NextResponse.json({
      contestants: winnersOnly,
      total: winnersOnly.length
    })

  } catch (error) {
    console.error('Error fetching school winners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch school winners' },
      { status: 500 }
    )
  }
}
