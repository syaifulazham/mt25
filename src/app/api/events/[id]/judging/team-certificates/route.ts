import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const eventId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const contestId = searchParams.get('contestId')
    const rank = searchParams.get('rank')

    if (!teamId || !contestId || !rank) {
      return NextResponse.json(
        { error: 'Team ID, contest ID, and rank are required' },
        { status: 400 }
      )
    }

    // Get winner template for this event
    const template = await prisma.certTemplate.findFirst({
      where: {
        eventId: eventId,
        targetType: 'EVENT_WINNER',
        status: 'ACTIVE'
      }
    })

    if (!template) {
      return NextResponse.json(
        { certificates: [] },
        { status: 200 }
      )
    }

    // Get team award title
    const awardTitle = parseInt(rank) === 1 
      ? 'TEMPAT PERTAMA' 
      : `TEMPAT KE-${rank}`

    // Fetch all team members with their certificate status
    const membersQuery = `
      SELECT 
        con.id as contestantId,
        con.name as memberName,
        con.ic,
        con.contingentId,
        c.id as certificateId,
        c.serialNumber,
        c.filePath,
        c.uniqueCode,
        c.awardTitle as certificateType,
        c.ownership
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      LEFT JOIN certificate c ON c.ic_number COLLATE utf8mb4_unicode_ci = con.ic COLLATE utf8mb4_unicode_ci
        AND c.templateId = ${template.id}
        AND c.awardTitle COLLATE utf8mb4_unicode_ci = '${awardTitle}' COLLATE utf8mb4_unicode_ci
      WHERE tm.teamId = ${parseInt(teamId)}
      ORDER BY con.name
    `

    const certificates = await prisma.$queryRawUnsafe(membersQuery) as any[]

    // Parse ownership JSON and format response
    const formattedCertificates = certificates.map(cert => ({
      contestantId: cert.contestantId,
      memberName: cert.memberName,
      ic: cert.ic,
      contingentId: cert.contingentId,
      certificateId: cert.certificateId || null,
      serialNumber: cert.serialNumber || null,
      filePath: cert.filePath || null,
      uniqueCode: cert.uniqueCode || null,
      certificateType: cert.certificateType || null,
      ownership: cert.ownership ? (
        typeof cert.ownership === 'string' 
          ? JSON.parse(cert.ownership) 
          : cert.ownership
      ) : null
    }))

    return NextResponse.json({
      certificates: formattedCertificates,
      count: formattedCertificates.length
    })

  } catch (error) {
    console.error('Failed to fetch team certificates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch team certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
