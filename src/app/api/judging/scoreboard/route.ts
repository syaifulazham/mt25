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
    
    // Get teams with their judging results using the exact same successful pattern as judge results API
    const results = stateId
      ? await prisma.$queryRaw`
          SELECT 
            at.id as attendanceTeamId,
            t.id as teamId,
            t.name as teamName,
            c.id as contingentId,
            c.name as contingentName,
            c.logoUrl as contingentLogoUrl,
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
            COALESCE(js.status, 'NOT_STARTED') as judgingStatus,
            js.totalScore
          FROM attendanceteam at
          JOIN team t ON at.teamId = t.id
          JOIN contingent c ON at.contingentId = c.id
          JOIN event e ON at.eventId = e.id
          JOIN eventcontest ec ON ec.eventId = at.eventId AND ec.contestId = ${parseInt(contestId)}
          LEFT JOIN judgingsession js ON js.attendanceTeamId = at.id AND js.eventContestId = ec.id
          WHERE at.eventId = ${parseInt(eventId)}
            AND (
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
              END
            ) = ${parseInt(stateId)}
          ORDER BY 
            CASE 
              WHEN js.totalScore IS NULL THEN 1 
              ELSE 0 
            END,
            js.totalScore DESC,
            t.name ASC
        ` as any[]
      : await prisma.$queryRaw`
          SELECT 
            at.id as attendanceTeamId,
            t.id as teamId,
            t.name as teamName,
            c.id as contingentId,
            c.name as contingentName,
            c.logoUrl as contingentLogoUrl,
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
            COALESCE(js.status, 'NOT_STARTED') as judgingStatus,
            js.totalScore
          FROM attendanceteam at
          JOIN team t ON at.teamId = t.id
          JOIN contingent c ON at.contingentId = c.id
          JOIN event e ON at.eventId = e.id
          JOIN eventcontest ec ON ec.eventId = at.eventId AND ec.contestId = ${parseInt(contestId)}
          LEFT JOIN judgingsession js ON js.attendanceTeamId = at.id AND js.eventContestId = ec.id
          WHERE at.eventId = ${parseInt(eventId)}
          ORDER BY 
            CASE 
              WHEN js.totalScore IS NULL THEN 1 
              ELSE 0 
            END,
            js.totalScore DESC,
            t.name ASC
        ` as any[];

    // Get total teams count (filtered by state if provided)
    const totalTeamsResult = stateId
      ? await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as totalCount
          FROM attendanceteam at
          INNER JOIN team t ON at.teamId = t.id
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as totalCount
          FROM attendanceteam at
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
          FROM attendanceteam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingsession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
            AND js.status = 'IN_PROGRESS'
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as inProgressCount
          FROM attendanceteam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingsession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
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
          FROM attendanceteam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingsession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND at.stateId = ${parseInt(stateId)}
            AND js.status = 'COMPLETED'
        `
      : await prisma.$queryRaw`
          SELECT COUNT(DISTINCT at.Id) as completedCount
          FROM attendanceteam at
          INNER JOIN eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId)}
          INNER JOIN eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
          INNER JOIN judgingsession js ON at.Id = js.attendanceTeamId AND ec.id = js.eventContestId
          WHERE at.eventId = ${parseInt(eventId)}
            AND js.status = 'COMPLETED'
        `;

    const completedCount = Array.isArray(completedResult) && completedResult.length > 0 
      ? Number((completedResult[0] as any).completedCount) || 0 
      : 0;

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
        rank: result.totalScore ? (index + 1) : 0
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
