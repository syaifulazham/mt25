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
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      )
    }

    // Count all pre-generated certificates for this template and event (across all contests)
    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM certificate
      WHERE ic_number IS NULL
        AND templateId = ${parseInt(templateId)}
        AND JSON_EXTRACT(ownership, '$.preGenerated') = true
        AND JSON_EXTRACT(ownership, '$.eventId') = ${eventId}
    `

    const count = result[0]?.count || 0

    return NextResponse.json({
      success: true,
      count: typeof count === 'bigint' ? Number(count) : count
    })

  } catch (error) {
    console.error('Error fetching pre-generated certificates count:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
