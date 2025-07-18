import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/judging/results
 * Gets aggregated team results for an event contest
 * Query params:
 *  - eventId: number (required)
 *  - contestId: number (required)
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

    // Get event contest
    const eventContest = await db.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId as string),
        contestId: parseInt(contestId as string)
      }
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }
    
    // Get all judges for this event contest
    const judges = await db.eventcontestjudge.findMany({
      where: {
        eventcontestId: eventContest.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });
    
    // Get all completed judging sessions for this event contest
    const judgingSessions = await db.judgingSession.findMany({
      where: {
        eventContestId: eventContest.id,
        status: 'COMPLETED'
      },
      include: {
        judgingSessionScores: true
      }
    });
    
    // Group sessions by team for aggregation
    const teamScores = new Map();
    
    for (const session of judgingSessions) {
      if (!teamScores.has(session.attendanceTeamId)) {
        teamScores.set(session.attendanceTeamId, {
          attendanceTeamId: session.attendanceTeamId,
          sessionCount: 0,
          totalScore: 0,
          averageScore: 0,
          sessions: []
        });
      }
      
      const teamScore = teamScores.get(session.attendanceTeamId);
      teamScore.sessionCount += 1;
      teamScore.totalScore += session.totalScore || 0;
      teamScore.sessions.push({
        judgeId: session.judgeId,
        score: session.totalScore,
        comments: session.comments
      });
      teamScore.averageScore = teamScore.totalScore / teamScore.sessionCount;
    }
    
    // Convert to array and sort by average score
    const results = Array.from(teamScores.values())
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((result, index) => ({ ...result, rank: index + 1 }));
    
    // Fetch team and contingent details for each result
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const attendanceTeam = await db.attendanceTeam.findUnique({
          where: { Id: result.attendanceTeamId }
        });
        
        const team = attendanceTeam ? await db.team.findUnique({
          where: { id: attendanceTeam.teamId }
        }) : null;
        
        const contingent = attendanceTeam ? await db.contingent.findUnique({
          where: { id: attendanceTeam.contingentId }
        }) : null;
        
        return {
          ...result,
          team: team ? {
            id: team.id,
            name: team.name
          } : null,
          contingent: contingent ? {
            id: contingent.id,
            name: contingent.name
          } : null
        };
      })
    );
    
    // Get judging template info
    const judgingTemplate = eventContest.judgingTemplateId ? 
      await db.judgingtemplate.findUnique({
        where: { id: eventContest.judgingTemplateId },
        include: {
          judgingtemplatecriteria: true
        }
      }) : null;
    
    return NextResponse.json({
      eventContest,
      judges,
      results: enhancedResults,
      judgingTemplate,
      totalTeams: enhancedResults.length,
      totalJudges: judges.length,
      totalSessions: judgingSessions.length
    });
    
  } catch (error) {
    console.error('Error getting judging results:', error);
    return NextResponse.json(
      { error: 'Failed to get judging results' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/judging/results/export
 * Exports judging results as CSV
 * Query params:
 *  - eventId: number (required)
 *  - contestId: number (required)
 */
export async function HEAD(req: NextRequest) {
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

    // Get event contest
    const eventContest = await db.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId as string),
        contestId: parseInt(contestId as string)
      },
      include: {
        contest: true,
        event: true
      }
    });

    if (!eventContest) {
      return NextResponse.json(
        { error: 'Event contest not found' },
        { status: 404 }
      );
    }
    
    // Get all completed judging sessions for this event contest
    const judgingSessions = await db.$queryRaw`
      SELECT
        js.id,
        js.judgeId,
        js.attendanceTeamId,
        js.totalScore,
        js.comments,
        js.createdAt,
        u.name as judgeName,
        at.teamId,
        t.name as teamName,
        c.id as contingentId,
        c.name as contingentName
      FROM
        judgingSession js
      JOIN
        user u ON js.judgeId = u.id
      JOIN
        attendanceTeam at ON js.attendanceTeamId = at.Id
      JOIN
        team t ON at.teamId = t.id
      JOIN
        contingent c ON at.contingentId = c.id
      WHERE
        js.eventContestId = ${eventContest.id}
        AND js.status = 'COMPLETED'
      ORDER BY
        t.name ASC,
        u.name ASC
    `;
    
    // Organize data by team for CSV
    const teamMap = new Map();
    
    for (const session of judgingSessions) {
      if (!teamMap.has(session.teamId)) {
        teamMap.set(session.teamId, {
          teamId: session.teamId,
          teamName: session.teamName,
          contingentName: session.contingentName,
          sessions: []
        });
      }
      
      const team = teamMap.get(session.teamId);
      team.sessions.push({
        judgeName: session.judgeName,
        score: session.totalScore,
        comments: session.comments
      });
    }
    
    // Generate CSV headers and rows
    const teamResults = Array.from(teamMap.values());
    
    // Create filename with event and contest info
    const filename = `${eventContest.event.name.replace(/\s+/g, '_')}_${eventContest.contest.name.replace(/\s+/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Return headers only for HEAD request
    const headers = {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/csv',
    };
    
    return new NextResponse(null, { 
      status: 200, 
      headers: headers 
    });
    
  } catch (error) {
    console.error('Error preparing judging results export:', error);
    return NextResponse.json(
      { error: 'Failed to prepare judging results export' },
      { status: 500 }
    );
  }
}
