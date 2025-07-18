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

    // Find the event contest
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: parseInt(eventId),
        id: parseInt(contestId),
      },
      include: {
        contest: true,
      },
    });

    if (!eventContest) {
      return NextResponse.json({ error: 'Event contest not found' }, { status: 404 });
    }
    
    // Get the judging template
    const judgingTemplate = eventContest.judgingTemplateId ? await prisma.judgingtemplate.findUnique({
      where: { id: eventContest.judgingTemplateId },
      include: {
        judgingtemplatecriteria: true,
      },
    }) : null;

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

    // Fetch judging sessions with scores
    const judgingSessions = await prisma.judgingSession.findMany({
      where: judgingSessionsQuery,
      include: {
        attendanceTeam: attendanceTeamInclude,
        judgingSessionScores: {
          include: {
            criterion: true
          }
        },
        judge: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
    });

    // Get unique list of teams that have been judged
    const teamResults: Record<number, any> = {};

    judgingSessions.forEach(session => {
      const attendanceTeamId = session.attendanceTeamId;
      
      // Get state information from contingent
      const contingent = session.attendanceTeam.contingent;
      let stateId = null;
      let stateName = null;
      
      if (contingent.school?.stateId) {
        stateId = contingent.school.stateId;
        stateName = contingent.school.state?.name;
      } else if (contingent.higherInstitution?.stateId) {
        stateId = contingent.higherInstitution.stateId;
        stateName = contingent.higherInstitution.state?.name;
      } else if (contingent.independent?.stateId) {
        stateId = contingent.independent.stateId;
        stateName = contingent.independent.state?.name;
      }

      if (!teamResults[attendanceTeamId]) {
        teamResults[attendanceTeamId] = {
          attendanceTeamId,
          teamName: session.attendanceTeam.team.name,
          contingentName: session.attendanceTeam.contingent.name,
          stateId,
          stateName,
          sessions: [],
          totalScore: 0,
          sessionCount: 0,
        };
      }

      teamResults[attendanceTeamId].sessions.push({
        judgeId: session.judgeId,
        judgeName: session.judge?.name || 'Unknown Judge',
        score: session.totalScore,
        comments: session.comments,
        scores: session.judgingSessionScores.map(score => ({
          criterionId: score.criterionId,
          criterionName: score.criterion?.name || 'Unknown Criterion',
          weight: score.criterion?.weight || 0,
          score: score.score,
          comments: score.comments
        }))
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

    // Create CSV header
    let csvHeader = 'Rank,Team Name,Contingent';
    
    if (event.scopeArea === 'ZONE') {
      csvHeader += ',State';
    }
    
    csvHeader += ',Average Score,Session Count';
    
    // If we have judging criteria, add them to the header
    if (judgingTemplate && judgingTemplate.judgingtemplatecriteria.length > 0) {
      judgingTemplate.judgingtemplatecriteria.forEach(criterion => {
        csvHeader += `,${criterion.name} (${criterion.weight}%)`;
      });
    }
    
    csvHeader += '\n';
    
    // Create CSV rows
    const csvRows = results.map((team: any) => {
      let row = `${team.rank},"${team.teamName}","${team.contingentName}"`;
      
      if (event.scopeArea === 'ZONE') {
        row += `,"${team.stateName || 'Unknown'}"`;
      }
      
      row += `,${team.averageScore.toFixed(2)},${team.sessionCount}`;
      
      // If we have judging criteria, add average scores per criterion
      if (judgingTemplate && judgingTemplate.judgingtemplatecriteria.length > 0) {
        judgingTemplate.judgingtemplatecriteria.forEach(criterion => {
          // Calculate average score for this criterion across all sessions
          let criterionScores = 0;
          let criterionCount = 0;
          
          team.sessions.forEach((session: any) => {
            const criterionScore = session.scores.find((s: any) => s.criterionId === criterion.id);
            if (criterionScore) {
              criterionScores += criterionScore.score;
              criterionCount++;
            }
          });
          
          const criterionAvg = criterionCount > 0 ? criterionScores / criterionCount : 0;
          row += `,${criterionAvg.toFixed(2)}`;
        });
      }
      
      return row + '\n';
    }).join('');
    
    // Combine header and rows
    const csv = csvHeader + csvRows;
    
    // Generate a filename with event name, contest name, and date
    const date = new Date().toISOString().split('T')[0];
    let filename = `Judging_Results_${event.name}_${eventContest.contest.name}_${date}`;
    
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
        id: parseInt(contestId),
      },
    });

    if (!contestExists) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if there are any completed judging sessions
    const sessionsCount = await prisma.judgingSession.count({
      where: {
        eventContestId: contestExists.id,
        status: 'COMPLETED',
      },
    });

    if (sessionsCount === 0) {
      return new NextResponse(null, { status: 404, statusText: 'No completed judging sessions found' });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error checking scoreboard export:', error);
    return new NextResponse(null, { status: 500 });
  }
}
