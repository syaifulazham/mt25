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

    // Query to count unique states participating in this event using attendanceTeam
    const statesQuery = `
      SELECT COUNT(DISTINCT at.stateId) as count
      FROM attendanceTeam at
      WHERE at.eventId = ${eventId}
      AND at.stateId IS NOT NULL
    `

    const result = await prisma.$queryRawUnsafe(statesQuery) as any[]
    const count = result[0]?.count || 0

    return NextResponse.json({
      success: true,
      count: Number(count)
    })

  } catch (error) {
    console.error('Error fetching states count:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch states count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
