import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const contestId = searchParams.get('contestId');
    const stateId = searchParams.get('stateId'); // Optional state filter

    if (!eventId || !contestId) {
      return NextResponse.json({ error: 'Event ID and Contest ID are required' }, { status: 400 });
    }

    // First fetch the event to determine its scopeArea
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: {
        id: true,
        name: true,
        scopeArea: true,
        stateId: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Find the event contest
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId),
        contestId: parseInt(contestId),
      },
    });

    if (!eventContest) {
      // Return empty results structure instead of 404 when eventcontest doesn't exist
      return NextResponse.json({
        results: [],
        totalTeams: 0,
        totalInProgress: 0,
        totalCompleted: 0,
        eventId: parseInt(eventId),
        contestId: parseInt(contestId),
        scopeArea: event.scopeArea
      });
    }

    // Get teams with their judging results - using exact same query as judge teams API
    const results = await prisma.$queryRaw`
      SELECT
        at.Id as attendanceTeamId,
        at.hashcode,
        at.contingentId,
        at.teamId,
        at.eventId,
        at.attendanceStatus,
        t.name as teamName,
        c.name as contingentName,
        c.logoUrl as contingentLogoUrl,
        c.contingentType as contingentType,
        e.name as eventName,
        e.scopeArea as eventScopeArea,
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.name FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.name FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END as stateName,
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.id FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.id FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END as stateId,
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
        event e ON at.eventId = e.id
      JOIN
        eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
      JOIN
        contest ON ec.contestId = contest.id
      JOIN
        eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
      LEFT JOIN
        judgingSession js ON at.Id = js.attendanceTeamId 
        AND ec.id = js.eventContestId
      WHERE
        at.eventId = ${parseInt(eventId)}
        ${stateId ? `AND (
          CASE
            WHEN c.contingentType = 'SCHOOL' THEN (
              SELECT s2.id FROM state s2
              JOIN school sch ON sch.stateId = s2.id
              WHERE c.schoolId = sch.id
            )
            WHEN c.contingentType = 'INDEPENDENT' THEN (
              SELECT s2.id FROM state s2
              JOIN independent ind ON ind.stateId = s2.id
              WHERE c.independentId = ind.id
            )
            ELSE NULL
          END = ${parseInt(stateId)}
        )` : ''}
      ORDER BY
        CASE 
          WHEN js.totalScore IS NULL THEN 1 
          ELSE 0 
        END,
        js.totalScore DESC,
        t.name ASC
    ` as any[];

    // Get total teams count
    const totalTeamsCount = results.length;

    // Get in-progress count
    const inProgressCount = results.filter((result: any) => result.judgingStatus === 'IN_PROGRESS').length;

    // Get completed count
    const completedCount = results.filter((result: any) => result.judgingStatus === 'COMPLETED').length;

    // Format results and add ranking - Convert BigInt values to numbers
    const formattedResults = (results as any[])
      .map((result, index) => ({
        attendanceTeamId: Number(result.attendanceTeamId),
        team: {
          id: Number(result.teamId),
          name: result.teamName
        },
        contingent: {
          id: Number(result.contingentId),
          name: result.contingentName,
          logoUrl: result.contingentLogoUrl
        },
        state: result.stateId ? {
          id: Number(result.stateId),
          name: result.stateName || 'Unknown State'
        } : null,
        totalScore: result.totalScore ? parseFloat(result.totalScore.toString()) : null,
        averageScore: result.totalScore ? parseFloat(result.totalScore.toString()) : 0,
        sessionCount: 1, // Since we're showing individual sessions now
        judgingStatus: result.judgingStatus || 'NOT_STARTED',
        rank: result.totalScore ? (index + 1) : 0,
        eventContestId: Number(result.eventContestId),
        contestName: result.contestName,
        attendanceStatus: result.attendanceStatus
      }));

    // Return results
    return NextResponse.json({
      results: formattedResults,
      totalTeams: totalTeamsCount,
      totalInProgress: inProgressCount,
      totalCompleted: completedCount,
      eventId: parseInt(eventId),
      contestId: parseInt(contestId),
      scopeArea: event.scopeArea,
    });
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch scoreboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
