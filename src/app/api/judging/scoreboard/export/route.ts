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

    // Find the event contest using the same pattern as main scoreboard API
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId),
        contestId: parseInt(contestId),
      },
    });

    if (!eventContest) {
      return NextResponse.json({ error: 'Event contest not found' }, { status: 404 });
    }

    // Get contest details
    const contest = await prisma.contest.findUnique({
      where: { id: parseInt(contestId) },
      select: { id: true, name: true },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Use raw SQL query similar to the working scoreboard API
    // Include both IN_PROGRESS and COMPLETED sessions
    const results = stateId 
      ? await prisma.$queryRaw`
          SELECT
            at.Id as attendanceTeamId,
            t.id as teamId,
            t.name as teamName,
            c.id as contingentId,
            c.name as contingentName,
            at.stateId as stateId,
            at.state as stateName,
            COUNT(js.id) as sessionCount,
            COALESCE(SUM(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE 0 END), 0) as totalScore,
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) as averageScore,
            GROUP_CONCAT(DISTINCT js.status) as judgingStatuses
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
            at.stateId as stateId,
            at.state as stateName,
            COUNT(js.id) as sessionCount,
            COALESCE(SUM(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE 0 END), 0) as totalScore,
            COALESCE(AVG(CASE WHEN js.status = 'COMPLETED' THEN js.totalScore ELSE NULL END), 0) as averageScore,
            GROUP_CONCAT(DISTINCT js.status) as judgingStatuses
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

    // Convert BigInt values to numbers and format results
    const formattedResults = (results as any[]).map((result, index) => ({
      attendanceTeamId: Number(result.attendanceTeamId),
      teamName: result.teamName,
      contingentName: result.contingentName,
      stateName: result.stateName || 'Unknown',
      sessionCount: Number(result.sessionCount),
      totalScore: parseFloat(result.totalScore.toString()),
      averageScore: parseFloat(result.averageScore.toString()),
      judgingStatuses: result.judgingStatuses || '',
      rank: index + 1,
    }));

    if (formattedResults.length === 0) {
      return NextResponse.json({ error: 'No judging sessions found' }, { status: 404 });
    }

    // Create CSV header
    let csvHeader = 'Rank,Team Name,Contingent';
    
    if (event.scopeArea === 'ZONE') {
      csvHeader += ',State';
    }
    
    csvHeader += ',Average Score,Session Count,Status';
    csvHeader += '\n';
    
    // Create CSV rows
    const csvRows = formattedResults.map((team: any) => {
      let row = `${team.rank},"${team.teamName}","${team.contingentName}"`;
      
      if (event.scopeArea === 'ZONE') {
        row += `,"${team.stateName || 'Unknown'}"`;
      }
      
      row += `,${team.averageScore.toFixed(2)},${team.sessionCount},"${team.judgingStatuses}"`;
      
      return row + '\n';
    }).join('');
    
    // Combine header and rows
    const csv = csvHeader + csvRows;
    
    // Generate a filename with event name, contest name, and date
    const date = new Date().toISOString().split('T')[0];
    let filename = `Judging_Results_${event.name}_${contest.name}_${date}`;
    
    if (event.scopeArea === 'ZONE' && stateId) {
      const state = await prisma.state.findUnique({
        where: { id: parseInt(stateId) },
        select: { name: true }
      });
      if (state) {
        filename += `_${state.name}`;
      }
    }
    
    filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv';
    
    // Return CSV as a file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting scoreboard:', error);
    return NextResponse.json(
      { error: 'Failed to export scoreboard' },
      { status: 500 }
    );
  }
}

export async function HEAD(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(null, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const contestId = searchParams.get('contestId');

    if (!eventId || !contestId) {
      return new NextResponse(null, { status: 400 });
    }

    // Check if the event and contest exist
    const eventExists = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });

    if (!eventExists) {
      return new NextResponse(null, { status: 404 });
    }

    const contestExists = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId),
        contestId: parseInt(contestId),
      },
    });

    if (!contestExists) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if there are any judging sessions (IN_PROGRESS or COMPLETED)
    const sessionsCount = await prisma.judgingSession.count({
      where: {
        eventContestId: contestExists.id,
        status: {
          in: ['IN_PROGRESS', 'COMPLETED']
        },
      },
    });

    if (sessionsCount === 0) {
      return new NextResponse(null, { status: 404, statusText: 'No judging sessions found' });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error checking scoreboard export:', error);
    return new NextResponse(null, { status: 500 });
  }
}
