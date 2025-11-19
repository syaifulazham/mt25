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

    // Get user's participant data with contingents (both direct and managed)
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        contingents: {
          select: {
            id: true
          }
        },
        managedContingents: {
          select: {
            contingentId: true
          }
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get contingent IDs from both direct contingents and managed contingents
    const directContingentIds = (participant.contingents || []).map(c => c.id)
    const managedContingentIds = (participant.managedContingents || []).map(cm => cm.contingentId)
    
    // Combine and deduplicate
    const contingentIds = [...new Set([...directContingentIds, ...managedContingentIds])]

    // If no contingents, return empty array
    if (contingentIds.length === 0) {
      return NextResponse.json({
        success: true,
        trainers: []
      })
    }

    // Fetch all managers/trainers for the user's contingents using raw query
    // Build the IN clause dynamically
    const placeholders = contingentIds.map(() => '?').join(',')
    
    const trainers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        m.id as managerId,
        m.name as managerName,
        m.email as managerEmail,
        m.ic as managerIc,
        c.name as contingentName,
        e.name as eventName,
        COALESCE(s.name, hi.name, i.name) as institutionName,
        cert.id as certificateId,
        cert.recipientName,
        cert.serialNumber,
        cert.uniqueCode,
        cert.status,
        ct.templateName as templateName
      FROM manager m
      INNER JOIN attendanceManager am ON m.id = am.managerId
      LEFT JOIN contingent c ON am.contingentId = c.id
      LEFT JOIN event e ON am.eventId = e.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN certificate cert ON cert.ic_number = m.ic AND cert.recipientType = 'TRAINER'
      LEFT JOIN cert_template ct ON cert.templateId = ct.id
      WHERE am.contingentId IN (${placeholders})
      ORDER BY m.name ASC`,
      ...contingentIds
    )

    // Transform the data into the expected structure
    const transformedTrainers = trainers.map(trainer => ({
      managerId: Number(trainer.managerId),
      managerName: trainer.managerName,
      managerEmail: trainer.managerEmail,
      managerIc: trainer.managerIc,
      contingentName: trainer.contingentName,
      eventName: trainer.eventName,
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
