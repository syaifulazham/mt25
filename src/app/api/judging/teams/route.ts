import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/judging/teams
 * Lists teams for judging with their judging status
 * Query params:
 *  - eventId: number (required)
 *  - contestId: number (required)
 *  - judgeId: number (optional, defaults to current user)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const contestId = searchParams.get('contestId');
    
    if (!eventId || !contestId) {
      return NextResponse.json(
        { error: 'eventId and contestId are required' },
        { status: 400 }
      );
    }

    // Get event contest with its related contest to access judgingTemplateId
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId as string),
        contestId: parseInt(contestId as string),
        isActive: true
      },
      include: {
        contest: true
      }
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }

    // Get current user as judge if judgeId not provided
    const judgeId = searchParams.get('judgeId') || session.user.id;

    // Check if the user is a judge for this event contest
    const isJudge = await prisma.eventcontestjudge.findFirst({
      where: {
        eventcontestId: eventContest.id,
        userId: parseInt(judgeId as string),
      }
    });

    if (!isJudge && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User is not authorized to judge this contest' },
        { status: 403 }
      );
    }

    // Get teams for this event contest with their judging status
    const teams = await prisma.$queryRaw`
      SELECT
        at.Id as attendanceTeamId,
        at.hashcode,
        at.contingentId,
        at.teamId,
        at.eventId,
        at.attendanceStatus,
        t.name as teamName,
        c.name as contingentName,
        ec.id as eventContestId,
        contest.name as contestName,
        CASE
          WHEN js.id IS NULL THEN 'NOT_STARTED'
          WHEN js.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
          WHEN js.status = 'COMPLETED' THEN 'COMPLETED'
          ELSE 'NOT_STARTED'
        END as judgingStatus,
        js.id as judgingSessionId,
        js.totalScore
      FROM
        attendanceTeam at
      JOIN
        team t ON at.teamId = t.id
      JOIN
        contingent c ON at.contingentId = c.id
      JOIN
        eventcontest ec ON at.eventId = ec.eventId
      JOIN
        contest ON ec.contestId = contest.id
      LEFT JOIN
        judgingSession js ON at.Id = js.attendanceTeamId 
        AND ec.id = js.eventContestId 
        AND js.judgeId = ${parseInt(judgeId as string)}
      WHERE
        at.eventId = ${parseInt(eventId as string)}
        AND ec.id = ${eventContest.id}
        AND at.attendanceStatus = 'Present'
      ORDER BY
        judgingStatus DESC,
        t.name ASC
    `;

    return NextResponse.json({
      teams,
      eventContest,
      judgingTemplateId: eventContest.contest.judgingTemplateId
    });

  } catch (error) {
    console.error('Error listing teams for judging:', error);
    return NextResponse.json(
      { error: 'Failed to list teams for judging' },
      { status: 500 }
    );
  }
}
