import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has required role
    const allowedRoles = ['ADMIN', 'OPERATOR']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const templateId = parseInt(params.id)

    // Get template details including eventId
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        templateName: true,
        eventId: true,
        targetType: true
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.targetType !== 'EVENT_PARTICIPANT') {
      return NextResponse.json(
        { error: 'This template is not for event participants' },
        { status: 400 }
      )
    }

    if (!template.eventId) {
      return NextResponse.json(
        { error: 'Template does not have an associated event' },
        { status: 400 }
      )
    }

    // Get all contestants with attendance status 'Present' for this event
    const contestants = await prisma.$queryRaw<Array<{
      id: number
      name: string
      ic: string
      contingentId: number
      contingentName: string
    }>>`
      SELECT DISTINCT
        c.id,
        c.name,
        c.ic,
        c.contingentId,
        cg.name as contingentName
      FROM contestant c
      INNER JOIN attendanceContestant ac ON ac.contestantId = c.id
      INNER JOIN attendanceContingent acon ON acon.contingentId = c.contingentId AND acon.eventId = ${template.eventId}
      INNER JOIN contingent cg ON cg.id = c.contingentId
      WHERE ac.attendanceStatus = 'Present'
        AND ac.eventId = ${template.eventId}
      ORDER BY cg.name, c.name
    `

    // Check certificate status for each contestant
    const contestantsWithStatus = await Promise.all(
      contestants.map(async (contestant) => {
        // Check if certificate exists for this contestant and eventId
        const certificate = await prisma.certificate.findFirst({
          where: {
            ic_number: contestant.ic,
            templateId: templateId
          },
          select: {
            id: true,
            filePath: true
          }
        })

        let certificateStatus: 'Listed' | 'Generated' | null = null
        let certificateId: number | null = null

        if (certificate) {
          certificateId = certificate.id
          certificateStatus = certificate.filePath ? 'Generated' : 'Listed'
        }

        return {
          id: contestant.id,
          name: contestant.name,
          ic: contestant.ic,
          contingent: {
            id: contestant.contingentId,
            name: contestant.contingentName
          },
          certificateStatus,
          certificateId
        }
      })
    )

    return NextResponse.json({
      contestants: contestantsWithStatus,
      total: contestantsWithStatus.length,
      event: {
        id: template.eventId
      }
    })
  } catch (error) {
    console.error('Error fetching contestants for generation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contestants' },
      { status: 500 }
    )
  }
}
