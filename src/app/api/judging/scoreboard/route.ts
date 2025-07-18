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
      return NextResponse.json({ error: 'Event contest not found' }, { status: 404 });
    }

    // Base query for judging sessions
    let judgingSessionsQuery: any = {
      eventContestId: eventContest.id,
      status: 'COMPLETED',
    };

    // Base include for attendanceTeam
    let attendanceTeamInclude: any = {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      contingent: {
        select: {
          id: true,
          name: true,
          school: {
            select: {
              stateId: true,
              state: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          higherInstitution: {
            select: {
              stateId: true,
              state: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          independent: {
            select: {
              stateId: true,
              state: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    };

    // Modify queries based on scopeArea
    if (event.scopeArea === 'ZONE') {
      if (stateId) {
        // For ZONE events with state filter, we need to filter teams by state
        judgingSessionsQuery.attendanceTeam = {
          OR: [
            { contingent: { school: { stateId: parseInt(stateId) } } },
            { contingent: { higherInstitution: { stateId: parseInt(stateId) } } },
            { contingent: { independent: { stateId: parseInt(stateId) } } },
          ],
        };
      }
    } else if (event.scopeArea === 'STATE') {
      // For STATE events, always filter by the event's stateId
      if (event.stateId) {
        judgingSessionsQuery.attendanceTeam = {
          OR: [
            { contingent: { school: { stateId: event.stateId } } },
            { contingent: { higherInstitution: { stateId: event.stateId } } },
            { contingent: { independent: { stateId: event.stateId } } },
          ],
        };
      }
    }
    // For NATIONAL events, no additional filtering is needed

    // Fetch judging sessions
    const judgingSessions = await prisma.judgingSession.findMany({
      where: judgingSessionsQuery,
      include: {
        attendanceTeam: attendanceTeamInclude,
      },
    });

    // Get unique list of teams that have been judged
    const teamResults: Record<number, any> = {};
    
    // Define interface for the attendanceTeam with included relations
    interface AttendanceTeamWithRelations {
      Id: number;
      contingentId: number;
      teamId: number;
      team?: { id: number; name: string; };
      contingent?: {
        id: number;
        name: string;
        school?: { stateId: number; state?: { id: number; name: string; } };
        higherInstitution?: { stateId: number; state?: { id: number; name: string; } };
        independent?: { stateId: number; state?: { id: number; name: string; } };
      };
      // other properties...
    }

    judgingSessions.forEach(session => {
      const attendanceTeamId = session.attendanceTeamId;
      // Cast attendanceTeam to the interface with relations
      const attendanceTeamData = session.attendanceTeam as AttendanceTeamWithRelations;
      
      // Get state information from attendanceTeam
      let stateId = null;
      let stateName = null;
      
      if (attendanceTeamData.contingent?.school?.stateId) {
        stateId = attendanceTeamData.contingent.school.stateId;
        stateName = attendanceTeamData.contingent.school.state?.name;
      } else if (attendanceTeamData.contingent?.higherInstitution?.stateId) {
        stateId = attendanceTeamData.contingent.higherInstitution.stateId;
        stateName = attendanceTeamData.contingent.higherInstitution.state?.name;
      } else if (attendanceTeamData.contingent?.independent?.stateId) {
        stateId = attendanceTeamData.contingent.independent.stateId;
        stateName = attendanceTeamData.contingent.independent.state?.name;
      }

      if (!teamResults[attendanceTeamId]) {
        const teamName = attendanceTeamData.team?.name || 'Unknown Team';
        let contingentName = attendanceTeamData.contingent?.name || 'Unknown Contingent';
        teamResults[attendanceTeamId] = {
          attendanceTeamId,
          team: { id: attendanceTeamData.team?.id || attendanceTeamData.teamId, name: teamName },
          contingent: { id: attendanceTeamData.contingent?.id || attendanceTeamData.contingentId, name: contingentName },
          stateId,
          state: stateId ? { id: stateId, name: stateName } : undefined,
          sessions: [],
          totalScore: 0,
          averageScore: 0,
          count: 0,
        };
      }

      teamResults[attendanceTeamId].sessions.push({
        judgeId: session.judgeId,
        score: session.totalScore,
        comments: session.comments,
      });

      teamResults[attendanceTeamId].totalScore += session.totalScore || 0;
      teamResults[attendanceTeamId].sessionCount += 1;
    });

    // Calculate average scores and create final results array
    const results = Object.values(teamResults).map((team: any) => {
      team.averageScore = team.sessionCount > 0 ? team.totalScore / team.sessionCount : 0;
      return team;
    });

    // Sort results by averageScore (descending)
    results.sort((a: any, b: any) => b.averageScore - a.averageScore);

    // Add rank to each team
    results.forEach((team: any, index: number) => {
      team.rank = index + 1;
    });

    // Get unique judge count
    const uniqueJudges = new Set();
    judgingSessions.forEach(session => {
      uniqueJudges.add(session.judgeId);
    });

    // Return results
    return NextResponse.json({
      results,
      totalTeams: results.length,
      totalJudges: uniqueJudges.size,
      totalSessions: judgingSessions.length,
      eventId: parseInt(eventId),
      contestId: parseInt(contestId),
      scopeArea: event.scopeArea,
    });
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoreboard' },
      { status: 500 }
    );
  }
}
