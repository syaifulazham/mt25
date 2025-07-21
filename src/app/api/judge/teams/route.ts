import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Use URL constructor instead of nextUrl.searchParams to avoid static generation bailout
    const url = new URL(request.url);
    const hashcode = url.searchParams.get('hashcode');
    const eventId = url.searchParams.get('eventId');
    const contestId = url.searchParams.get('contestId');

    if (!hashcode || !eventId || !contestId) {
      return NextResponse.json(
        { error: 'Hashcode, eventId, and contestId are required' },
        { status: 400 }
      );
    }

    // Verify judge endpoint exists
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: {
        hashcode: hashcode,
        eventId: parseInt(eventId),
        contestId: parseInt(contestId)
      }
    });

    if (!judgeEndpoint) {
      return NextResponse.json(
        { error: 'Invalid judge endpoint' },
        { status: 401 }
      );
    }

    // Get event contest with its related contest to access judgingTemplateId
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId as string),
        contestId: parseInt(contestId as string)
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

    // Get teams for this event contest with their judging status (same query as organizer API)
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
        eventcontest ec ON at.eventId = ec.eventId AND ec.contestId = ${parseInt(contestId as string)}
      JOIN
        contest ON ec.contestId = contest.id
      JOIN
        eventcontestteam ect ON ect.eventcontestId = ec.id AND ect.teamId = at.teamId
      LEFT JOIN
        judgingSession js ON at.Id = js.attendanceTeamId 
        AND ec.id = js.eventContestId
      WHERE
        at.eventId = ${parseInt(eventId as string)}
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
    console.error('Error fetching teams for judge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
