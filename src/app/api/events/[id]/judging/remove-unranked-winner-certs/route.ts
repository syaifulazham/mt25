import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    const eventId = parseInt(params.id)
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
    }

    const body = await request.json()
    const contestId = Number(body?.contestId)
    const unrankedTeamIds = Array.isArray(body?.unrankedTeamIds)
      ? body.unrankedTeamIds.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
      : []

    if (!contestId || unrankedTeamIds.length === 0) {
      return NextResponse.json(
        { error: 'contestId and unrankedTeamIds are required' },
        { status: 400 }
      )
    }

    const template = await prisma.certTemplate.findFirst({
      where: {
        eventId: eventId,
        targetType: 'EVENT_WINNER',
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'No active winner certificate template found for this event' },
        { status: 404 }
      )
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, code: true, name: true }
    })

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    const contestName = contest.code ? `${contest.code} - ${contest.name}` : contest.name

    // Keep scope strictly to the provided teams & contest
    const validTeamsInContest = await prisma.$queryRaw<{ teamId: number }[]>`
      SELECT DISTINCT t.id as teamId
      FROM team t
      WHERE t.id IN (${Prisma.join(unrankedTeamIds.map((id: number) => Prisma.sql`${id}`))})
        AND t.contestId = ${contestId}
    `

    const scopedUnrankedTeamIds = (validTeamsInContest || []).map(t => Number(t.teamId)).filter(Boolean)

    if (scopedUnrankedTeamIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unranked teams found for this contest',
        removedTeams: 0,
        removedCertificates: 0
      })
    }

    const members = await prisma.$queryRaw<{ ic: string | null }[]>`
      SELECT DISTINCT con.ic as ic
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      WHERE tm.teamId IN (${Prisma.join(scopedUnrankedTeamIds.map((id: number) => Prisma.sql`${id}`))})
        AND con.ic IS NOT NULL
        AND TRIM(con.ic) <> ''
    `

    const ics = (members || []).map(m => (m.ic || '').trim()).filter(ic => ic.length > 0)

    if (ics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Unranked teams have no member ICs to match certificates',
        removedTeams: scopedUnrankedTeamIds.length,
        removedCertificates: 0
      })
    }

    const existingCerts = await prisma.$queryRaw<{ id: number; filePath: string | null }[]>`
      SELECT id, filePath
      FROM certificate
      WHERE templateId = ${template.id}
        AND contestName = ${contestName}
        AND TRIM(ic_number) IN (${Prisma.join(ics.map((ic) => Prisma.sql`${ic}`))})
    `

    if (!existingCerts || existingCerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No certificates found for unranked teams',
        removedTeams: scopedUnrankedTeamIds.length,
        removedCertificates: 0
      })
    }

    await prisma.$executeRaw`
      DELETE FROM certificate
      WHERE id IN (${Prisma.join(existingCerts.map((c) => Prisma.sql`${c.id}`))})
    `

    return NextResponse.json({
      success: true,
      message: 'Removed certificates for unranked teams',
      removedTeams: scopedUnrankedTeamIds.length,
      removedCertificates: existingCerts.length
    })
  } catch (error) {
    console.error('Failed to remove certificates for unranked teams:', error)
    return NextResponse.json(
      {
        error: 'Failed to remove certificates for unranked teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
