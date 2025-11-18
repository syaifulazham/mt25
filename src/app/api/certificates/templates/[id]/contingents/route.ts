import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const userRole = session.user.role
    if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const templateId = parseInt(params.id)

    // Verify template exists and is CONTINGENT type
    const template = await prisma.certTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify it's a CONTINGENT template
    if (template.targetType !== 'CONTINGENT') {
      return NextResponse.json(
        { error: 'Template is not a CONTINGENT type' },
        { status: 400 }
      )
    }

    // Fetch all contingents with their data using raw SQL for better performance
    const contingents = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.name,
        c.contingentType,
        COALESCE(
          sch.stateId,
          hi.stateId,
          ind.stateId
        ) as stateId,
        COALESCE(
          st_sch.name,
          st_hi.name,
          st_ind.name
        ) as stateName,
        
        -- Count contestants
        (SELECT COUNT(*) FROM contestant ct WHERE ct.contingentId = c.id) as contestantsCount,
        
        -- Count zone event teams
        (SELECT COUNT(DISTINCT at.teamId) 
         FROM attendanceTeam at
         INNER JOIN event e ON e.id = at.eventId
         WHERE at.contingentId = c.id 
         AND e.scopeArea = 'ZONE') as zoneTeamsCount,
        
        -- Count national event teams
        (SELECT COUNT(DISTINCT at.teamId) 
         FROM attendanceTeam at
         INNER JOIN event e ON e.id = at.eventId
         WHERE at.contingentId = c.id 
         AND e.scopeArea = 'NATIONAL') as nationalTeamsCount,
        
        -- Certificate data
        cert.id as certificateId,
        cert.filePath as certificateFilePath,
        cert.serialNumber as certificateSerialNumber
        
      FROM contingent c
      LEFT JOIN school sch ON sch.id = c.schoolId
      LEFT JOIN state st_sch ON st_sch.id = sch.stateId
      LEFT JOIN higherinstitution hi ON hi.id = c.higherInstId
      LEFT JOIN state st_hi ON st_hi.id = hi.stateId
      LEFT JOIN independent ind ON ind.id = c.independentId
      LEFT JOIN state st_ind ON st_ind.id = ind.stateId
      LEFT JOIN certificate cert ON JSON_EXTRACT(cert.ownership, '$.contingentId') = c.id
        AND cert.templateId = ${templateId}
      ORDER BY c.name ASC
    `

    // Format the response
    const formattedContingents = contingents.map(c => ({
      id: c.id,
      name: c.name,
      contingentType: c.contingentType,
      stateId: c.stateId,
      stateName: c.stateName,
      contestantsCount: Number(c.contestantsCount) || 0,
      zoneTeamsCount: Number(c.zoneTeamsCount) || 0,
      nationalTeamsCount: Number(c.nationalTeamsCount) || 0,
      certificate: c.certificateId ? {
        id: c.certificateId,
        filePath: c.certificateFilePath,
        serialNumber: c.certificateSerialNumber
      } : null
    }))

    return NextResponse.json(formattedContingents)

  } catch (error) {
    console.error('Error fetching contingents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contingents' },
      { status: 500 }
    )
  }
}
