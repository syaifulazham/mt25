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

    // Get user's participant data (we only need the participant id here)
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email },
      select: {
        id: true
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Mirror the scope logic from /api/participants/managers:
    // 1) Find contingents where current participant is a manager
    // 2) Find all participants who manage those same contingents
    // 3) Include all managers created by any of those participants
    // 4) If user manages no contingents, only include managers they created

    const userContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id,
      },
      select: {
        contingentId: true,
      },
    })

    let managerCreatorIds: number[] = []

    if (userContingents.length === 0) {
      // If user is not a manager of any contingent, only return their own managers
      managerCreatorIds = [participant.id]
    } else {
      const contingentIds = userContingents.map((c) => c.contingentId)

      const contingentManagers = await prisma.contingentManager.findMany({
        where: {
          contingentId: { in: contingentIds },
        },
        select: {
          participantId: true,
        },
      })

      managerCreatorIds = Array.from(
        new Set(contingentManagers.map((cm) => cm.participantId))
      )

      if (managerCreatorIds.length === 0) {
        managerCreatorIds = [participant.id]
      }
    }

    if (managerCreatorIds.length === 0) {
      return NextResponse.json({ success: true, trainers: [] })
    }

    const placeholders = managerCreatorIds.map(() => '?').join(',')

    // Fetch all managers/trainers in this scope and left-join any TRAINER certificates by IC.
    // We also try to resolve contingent/event/institution information via manager_team/legacy
    // teamId -> team -> contingent/event.
    const trainers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        m.id as managerId,
        m.name as managerName,
        m.email as managerEmail,
        m.ic as managerIc,
        c.name as contingentName,
        GROUP_CONCAT(DISTINCT e.name ORDER BY e.name SEPARATOR ', ') as eventNames,
        COALESCE(s.name, hi.name, i.name) as institutionName,
        cert.id as certificateId,
        cert.recipientName,
        cert.serialNumber,
        cert.uniqueCode,
        cert.status,
        ct.templateName as templateName
      FROM manager m
      LEFT JOIN manager_team mt ON mt.managerId = m.id
      LEFT JOIN team t ON t.id = COALESCE(mt.teamId, m.teamId)
      LEFT JOIN contingent c ON t.contingentId = c.id
      LEFT JOIN eventcontestteam ect ON ect.teamId = t.id
      LEFT JOIN eventcontest ec ON ec.id = ect.eventcontestId
      LEFT JOIN event e ON ec.eventId = e.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN certificate cert ON cert.ic_number = m.ic AND cert.recipientType = 'TRAINER'
      LEFT JOIN cert_template ct ON cert.templateId = ct.id
      WHERE m.createdBy IN (${placeholders})
      GROUP BY m.id, m.name, m.email, m.ic, c.name, institutionName,
               cert.id, cert.recipientName, cert.serialNumber, cert.uniqueCode, cert.status, ct.templateName
      ORDER BY m.name ASC`,
      ...managerCreatorIds
    )

    // Transform the data into the expected structure
    const transformedTrainers = trainers.map(trainer => ({
      managerId: Number(trainer.managerId),
      managerName: trainer.managerName,
      managerEmail: trainer.managerEmail,
      managerIc: trainer.managerIc,
      contingentName: trainer.contingentName,
      eventName: trainer.eventNames || null,
      institutionName: trainer.institutionName,
      certificate: trainer.certificateId ? {
        id: Number(trainer.certificateId),
        recipientName: trainer.recipientName,
        serialNumber: trainer.serialNumber,
        uniqueCode: trainer.uniqueCode,
        status: trainer.status,
        templateName: trainer.templateName
      } : null
    }))

    return NextResponse.json({
      success: true,
      trainers: transformedTrainers
    })

  } catch (error) {
    console.error('Error fetching trainer certificates:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch trainer certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
