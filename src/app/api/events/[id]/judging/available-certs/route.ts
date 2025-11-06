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
    const contestId = searchParams.get('contestId')
    const rank = searchParams.get('rank')
    const stateId = searchParams.get('stateId') // Optional: for state-based ranking

    if (!contestId || !rank) {
      return NextResponse.json(
        { error: 'Contest ID and rank are required' },
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
        { error: 'No active winner certificate template found' },
        { status: 404 }
      )
    }

    // Fetch all available pre-generated blank certificates for this rank
    // Build the query with optional state filter
    let availableCerts: any[]
    
    if (stateId) {
      // State-based ranking: filter by stateId
      availableCerts = await prisma.$queryRaw<any[]>`
        SELECT id, serialNumber, uniqueCode, filePath, ownership
        FROM certificate
        WHERE templateId = ${template.id}
          AND ic_number IS NULL
          AND JSON_EXTRACT(ownership, '$.preGenerated') = true
          AND JSON_EXTRACT(ownership, '$.rank') = ${parseInt(rank)}
          AND JSON_EXTRACT(ownership, '$.contestId') = ${parseInt(contestId)}
          AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
          AND JSON_EXTRACT(ownership, '$.stateId') = ${parseInt(stateId)}
        ORDER BY JSON_EXTRACT(ownership, '$.memberNumber') ASC
      `
    } else {
      // National ranking: no state filter, and stateId should be NULL
      availableCerts = await prisma.$queryRaw<any[]>`
        SELECT id, serialNumber, uniqueCode, filePath, ownership
        FROM certificate
        WHERE templateId = ${template.id}
          AND ic_number IS NULL
          AND JSON_EXTRACT(ownership, '$.preGenerated') = true
          AND JSON_EXTRACT(ownership, '$.rank') = ${parseInt(rank)}
          AND JSON_EXTRACT(ownership, '$.contestId') = ${parseInt(contestId)}
          AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
          AND JSON_EXTRACT(ownership, '$.stateId') IS NULL
        ORDER BY JSON_EXTRACT(ownership, '$.memberNumber') ASC
      `
    }

    // Parse ownership JSON for each certificate
    const certificates = availableCerts.map(cert => ({
      ...cert,
      ownership: typeof cert.ownership === 'string' 
        ? JSON.parse(cert.ownership) 
        : cert.ownership
    }))

    return NextResponse.json({
      certificates,
      count: certificates.length
    })

  } catch (error) {
    console.error('Failed to fetch available certificates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch available certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
