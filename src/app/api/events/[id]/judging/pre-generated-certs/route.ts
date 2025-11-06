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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const contestId = searchParams.get('contestId')

    if (!contestId) {
      return NextResponse.json(
        { error: 'contestId is required' },
        { status: 400 }
      )
    }

    // Query pre-generated (blank) certificates for this event and contest
    const blankCerts = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        templateId,
        serialNumber,
        uniqueCode,
        awardTitle,
        filePath,
        createdAt,
        ownership
      FROM certificate
      WHERE ic_number IS NULL
        AND JSON_EXTRACT(ownership, '$.preGenerated') = true
        AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
        AND JSON_EXTRACT(ownership, '$.contestId') = ${parseInt(contestId)}
      ORDER BY JSON_EXTRACT(ownership, '$.rank')
    `

    // Parse ownership JSON
    const certificates = blankCerts.map((cert: any) => ({
      ...cert,
      ownership: typeof cert.ownership === 'string' ? JSON.parse(cert.ownership) : cert.ownership
    }))

    return NextResponse.json({
      success: true,
      certificates,
      count: certificates.length
    })

  } catch (error) {
    console.error('Error fetching pre-generated certificates:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch pre-generated certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
