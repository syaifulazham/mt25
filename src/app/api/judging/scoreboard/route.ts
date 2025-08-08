import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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
    const stateId = searchParams.get('stateId');

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
        id: parseInt(contestId),
      },
    });

    if (!eventContest) {
      // Return empty results structure instead of 404 when eventcontest doesn't exist
      return NextResponse.json({
        results: [],
        totalTeams: 0,
        totalJudges: 0,
        totalSessions: 0,
        eventId: parseInt(eventId),
        contestId: parseInt(contestId),
        scopeArea: event.scopeArea
      });
    }

    // Simplify the query first to avoid SQL injection issues
    // We'll handle state filtering in a separate step if needed
    
    // Use conditional raw SQL query to get scoreboard data with proper joins
    const results = stateId 
      ? await prisma.$queryRaw`
          SELECT
            at.Id as attendanceTeamId,
            t.id as teamId,
            t.name as teamName,
            c.id as contingentId,
            c.name as contingentName,
            c.logoUrl as contingentLogoUrl,
            at.stateId as stateId,
            at.state as stateName,
            COUNT(js.id) as sessionCount,
            COALESCE(SUM(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE 0 END), 0) as totalScore,
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) as averageScore,
            MAX(js.status) as judgingStatus
          FROM
            attendanceTeam at
          INNER JOIN
            team t ON at.teamId = t.id
          INNER JOIN
            contingent c ON at.contingentId = c.id
          INNER JOIN
            eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN
            eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          LEFT JOIN
            judgingSession js ON at.Id = js.attendanceTeamId 
            AND ec.id = js.eventContestId 
            AND js.status IN ('IN_PROGRESS', 'COMPLETED')
          WHERE
            at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
          GROUP BY
            at.Id, t.id, t.name, c.id, c.name, at.stateId, at.state
          ORDER BY
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) DESC
        `
      : await prisma.$queryRaw`
          SELECT
            at.Id as attendanceTeamId,
            t.id as teamId,
            t.name as teamName,
            c.id as contingentId,
            c.name as contingentName,
            c.logoUrl as contingentLogoUrl,
            at.stateId as stateId,
            at.state as stateName,
            COUNT(js.id) as sessionCount,
            COALESCE(SUM(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE 0 END), 0) as totalScore,
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) as averageScore,
            MAX(js.status) as judgingStatus
          FROM
            attendanceTeam at
          INNER JOIN
            team t ON at.teamId = t.id
          INNER JOIN
            contingent c ON at.contingentId = c.id
          INNER JOIN
            eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN
            eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          LEFT JOIN
            judgingSession js ON at.Id = js.attendanceTeamId 
            AND ec.id = js.eventContestId 
            AND js.status IN ('IN_PROGRESS', 'COMPLETED')
          WHERE
            at.eventId = ${parseInt(eventId)}
          GROUP BY
            at.Id, t.id, t.name, c.id, c.name, at.stateId, at.state
          ORDER BY
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) DESC
        `;

    // Get total teams count (filtered by state if provided)
    const totalTeamsResult = stateId
      ? await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as totalCount
          FROM attendanceTeam at
          INNER JOIN team t ON at.teamId = t.id
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as totalCount
          FROM attendanceTeam at
          INNER JOIN team t ON at.teamId = t.id
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          WHERE at.eventId = ${parseInt(eventId)}
        `;

    const totalTeamsCount = Array.isArray(totalTeamsResult) && totalTeamsResult.length > 0 
      ? Number((totalTeamsResult[0] as any).totalCount) || 0 
      : 0;

    // Get in-progress count (filtered by state if provided)
    const inProgressResult = stateId
      ? await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as inProgressCount
          FROM attendanceTeam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingSession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
            AND js.status = 'IN_PROGRESS'
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as inProgressCount
          FROM attendanceTeam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingSession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND js.status = 'IN_PROGRESS'
        `;

    const inProgressCount = Array.isArray(inProgressResult) && inProgressResult.length > 0 
      ? Number((inProgressResult[0] as any).inProgressCount) || 0 
      : 0;

    // Get completed count (filtered by state if provided)
    const completedResult = stateId
      ? await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as completedCount
          FROM attendanceTeam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingSession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
            AND js.status = 'COMPLETED'
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as completedCount
          FROM attendanceTeam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingSession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND js.status = 'COMPLETED'
        `;

    const completedCount = Array.isArray(completedResult) && completedResult.length > 0 
      ? Number((completedResult[0] as any).completedCount) || 0 
      : 0;

    // Format results and add ranking - Convert BigInt values to numbers
    const formattedResults = (results as any[])
      .sort((a, b) => parseFloat(b.averageScore.toString()) - parseFloat(a.averageScore.toString()))
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
        totalScore: parseFloat(result.totalScore.toString()),
        averageScore: parseFloat(result.averageScore.toString()),
        sessionCount: Number(result.sessionCount),
        judgingStatus: result.judgingStatus,
        rank: index + 1
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
