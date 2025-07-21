import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hashcode = searchParams.get('hashcode');

    if (!hashcode) {
      return NextResponse.json(
        { error: 'Hashcode is required' },
        { status: 400 }
      );
    }

    // Verify judge endpoint exists using raw query to avoid Prisma naming issues
    const judgeEndpointResult = await prisma.$queryRaw`
      SELECT * FROM judges_endpoints WHERE hashcode = ${hashcode} LIMIT 1
    `;
    
    const judgeEndpoint = Array.isArray(judgeEndpointResult) ? judgeEndpointResult[0] : null;

    if (!judgeEndpoint) {
      return NextResponse.json(
        { error: 'Invalid judge endpoint' },
        { status: 401 }
      );
    }

    const sessionId = parseInt(params.sessionId);
    console.log('Fetching judge session:', { sessionId, hashcode });

    // Get the judging session with scores using the same pattern as organizer API
    const session = await prisma.judgingSession.findUnique({
      where: { id: sessionId },
      include: {
        judgingSessionScore: {
          orderBy: {
            criterionId: 'asc'
          }
        }
      }
    });

    if (!session) {
      console.log('Session not found:', sessionId);
      return NextResponse.json(
        { error: 'Judging session not found' },
        { status: 404 }
      );
    }

    console.log('Session found:', {
      id: session.id,
      attendanceTeamId: session.attendanceTeamId,
      eventContestId: session.eventContestId,
      scoresCount: session.judgingSessionScore?.length || 0
    });

    // Get associated event contest and template info
    let eventContestWithTemplate = null;
    if (session) {
      eventContestWithTemplate = await prisma.eventcontest.findUnique({
        where: { id: session.eventContestId },
        include: {
          contest: true
        }
      });
    }
    
    // Get template ID from contest
    const templateId = eventContestWithTemplate?.contest?.judgingTemplateId;
    console.log('Template ID for session:', templateId);

    // Get the criteria details including discrete values for DISCRETE type
    let criteriaWithDetails: any[] = [];
    
    if (session && session.judgingSessionScore.length > 0 && templateId) {
      // Get template criteria with discrete values
      const templateCriteria = await prisma.judgingtemplatecriteria.findMany({
        where: {
          judgingtemplate: { id: templateId },
        },
        select: {
          id: true,
          name: true,
          description: true,
          weight: true,
          maxScore: true,
          evaluationType: true,
          discreteValues: true
        }
      });
      
      console.log('Template criteria count:', templateCriteria.length);
      console.log('Template criteria IDs:', templateCriteria.map(c => c.id));
      console.log('Session score criterionIds:', session.judgingSessionScore.map(s => s.criterionId));
      
      // Create a map for quick lookup
      const criteriaMap = new Map();
      templateCriteria.forEach((criterion: any) => {
        criteriaMap.set(criterion.id, criterion);
      });
      
      // Map session scores with template criteria
      criteriaWithDetails = session.judgingSessionScore.map((score: any, index: number) => {
        let criterion = criteriaMap.get(score.criterionId);
        
        // If direct mapping fails, try mapping by order/index
        if (!criterion && templateCriteria[index]) {
          criterion = templateCriteria[index];
          console.log(`Mapping by index ${index}: score.criterionId=${score.criterionId} -> criterion.id=${criterion.id}`);
        }
        
        return {
          id: score.id,
          judgingSessionId: sessionId,
          criterionId: score.criterionId,
          score: score.score ? parseFloat(score.score.toString()) : null,
          selectedDiscreteText: score.selectedDiscreteText || null,
          criterionName: criterion?.name || 'Unknown Criterion',
          criterionDescription: criterion?.description || '',
          criterionType: criterion?.evaluationType || 'POINTS',
          maxScore: criterion?.maxScore ? parseFloat(criterion.maxScore.toString()) : 0,
          weight: criterion?.weight ? parseFloat(criterion.weight.toString()) : 0,
          discreteValues: criterion?.discreteValues
        };
      });
    }

    // Get team and contingent data
    const attendanceTeam = await prisma.attendanceTeam.findFirst({
      where: { Id: session.attendanceTeamId }
    });
    
    // Get team and contingent details separately
    let teamData = null;
    let contingentData = null;
    
    if (attendanceTeam) {
      teamData = await prisma.team.findFirst({
        where: { id: attendanceTeam.teamId }
      });
      
      contingentData = await prisma.contingent.findFirst({
        where: { id: attendanceTeam.contingentId }
      });
    }

    const sessionData = {
      id: session.id,
      attendanceTeamId: session.attendanceTeamId,
      eventContestId: session.eventContestId,
      // judgingTemplateId: templateId, // This field doesn't exist in the session table
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      totalScore: session.totalScore,
      comments: session.comments,
      judgingSessionScores: criteriaWithDetails
    };

    // Prepare team data
    const teamResponse = {
      id: teamData?.id || 0,
      name: teamData?.name || 'Unknown Team',
      teamName: teamData?.name || 'Unknown Team'
    };

    // Prepare contingent data
    const contingentResponse = {
      id: contingentData?.id || 0,
      name: contingentData?.name || 'Unknown Contingent'
    };

    // Prepare event contest data
    const eventContestData = {
      id: eventContestWithTemplate?.id || 0,
      eventId: eventContestWithTemplate?.eventId || 0,
      contestId: eventContestWithTemplate?.contestId || 0,
      contest: {
        id: eventContestWithTemplate?.contest?.id || 0,
        name: eventContestWithTemplate?.contest?.name || 'Unknown Contest'
      }
    };

    console.log('Returning session data:', {
      id: sessionData.id,
      teamName: teamResponse.name,
      contestName: eventContestData.contest.name,
      scoresCount: sessionData.judgingSessionScores.length
    });

    return NextResponse.json({
      session: sessionData,
      team: teamResponse,
      contingent: contingentResponse,
      eventContest: eventContestData
    });
  } catch (error) {
    console.error('Error fetching judging session for judge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch judging session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const { hashcode, scores, status } = body;

    if (!hashcode) {
      return NextResponse.json(
        { error: 'Hashcode is required' },
        { status: 400 }
      );
    }

    // Verify judge endpoint exists using raw SQL
    const judgeEndpointResult = await prisma.$queryRaw`
      SELECT * FROM judges_endpoints WHERE hashcode = ${hashcode}
    ` as any[];
    
    const judgeEndpoint = judgeEndpointResult.length > 0 ? judgeEndpointResult[0] : null;

    if (!judgeEndpoint) {
      return NextResponse.json(
        { error: 'Invalid judge endpoint' },
        { status: 401 }
      );
    }

    const sessionId = parseInt(params.sessionId);

    // Update scores if provided
    if (scores && Array.isArray(scores)) {
      for (const scoreData of scores) {
        await prisma.judgingSessionScore.updateMany({
          where: {
            judgingSessionId: sessionId,
            criterionId: scoreData.criterionId
          },
          data: {
            score: scoreData.score,
            selectedDiscreteText: scoreData.selectedDiscreteText
          }
        });
      }
    }

    // Calculate total score from database
    const sessionScores = await prisma.judgingSessionScore.findMany({
      where: { judgingSessionId: sessionId }
    });

    const validScores = sessionScores
      .filter((s: any) => s.score !== null)
      .map((s: any) => parseFloat(s.score!.toString()));
    
    const calculatedTotalScore = validScores.reduce((sum: number, score: number) => sum + score, 0);

    // Update session
    const updatedSession = await prisma.judgingSession.update({
      where: { id: sessionId },
      data: {
        status: status || undefined,
        totalScore: calculatedTotalScore
      },

    });

    const sessionData = {
      id: updatedSession.id,
      attendanceTeamId: updatedSession.attendanceTeamId,
      eventContestId: updatedSession.eventContestId,
      status: updatedSession.status,
      totalScore: updatedSession.totalScore ? parseFloat(updatedSession.totalScore.toString()) : 0
    };

    return NextResponse.json({
      session: sessionData,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Error updating judging session for judge:', error);
    return NextResponse.json(
      { error: 'Failed to update judging session' },
      { status: 500 }
    );
  }
}
