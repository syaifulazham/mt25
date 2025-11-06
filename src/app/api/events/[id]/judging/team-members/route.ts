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

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Get all team members
    const membersQuery = `
      SELECT 
        con.id as contestantId,
        con.name,
        con.ic,
        con.contingentId
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      WHERE tm.teamId = ${parseInt(teamId)}
      ORDER BY con.name
    `

    const members = await prisma.$queryRawUnsafe(membersQuery) as any[]

    return NextResponse.json({
      members,
      count: members.length
    })

  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch team members',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
