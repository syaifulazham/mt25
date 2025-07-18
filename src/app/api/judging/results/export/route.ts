import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/judging/results/export
 * Exports judging results as CSV
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
    const eventContest = await prisma.eventcontest.findFirst({
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
    
    // Get all judges for this event contest
    const judges = await prisma.eventcontestjudge.findMany({
      where: {
        eventcontestId: eventContest.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Get judging template to include criteria in the export
    const judgingTemplate = eventContest.contest.judgingTemplateId ? 
      await prisma.judgingtemplate.findUnique({
        where: { id: eventContest.contest.judgingTemplateId },
        include: {
          judgingtemplatecriteria: {
            orderBy: { id: 'asc' }
          }
        }
      }) as ({
        id: number;
        name: string;
        description: string | null;
        isDefault: boolean;
        contestType: string | null;
        createdAt: Date;
        updatedAt: Date;
        judgingtemplatecriteria: Array<{
          id: number;
          name: string;
          description: string | null;
          needsJuryCourtesy: boolean;
          evaluationType: string;
          weight: number;
          maxScore: number | null;
          discreteValues: string | null;
          templateId: number;
          createdAt: Date;
          updatedAt: Date;
          order?: number;
        }>;
      } | null) : null;
    
    // Define the interface for judging session results
    interface JudgingSession {
      id: number;
      judgeId: number;
      attendanceTeamId: number;
      totalScore: number;
      comments: string | null;
      createdAt: Date;
      judgeName: string;
      teamId: number;
      teamName: string;
      contingentId: number;
      contingentName: string;
    }
    
    // Define interface for a team session (used in team.sessions)
    interface TeamSession {
      id: number;
      judgeName: string;
      judgeId: number;
      score: number;
      comments: string;
    }
    
    // Define interface for judging session scores
    interface JudgingSessionScore {
      id: number;
      judgingSessionId: number;
      criterionId: number;  // Note: this is 'criterionId' not 'criteriaId'
      score: Decimal | number;
      comments: string | null;
      createdAt: Date;
      updatedAt: Date;
      criterionName: string;
      criterionDescription: string | null;
      criterionWeight: number;
      criterionType: string;
      maxScore: number;
    }
    
    // Import Decimal type from Prisma
    type Decimal = Prisma.Decimal;
    
    // Get all completed judging sessions with detailed scores
    const judgingSessions = await prisma.$queryRaw<JudgingSession[]>`
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
    
    // Get all scores for the completed sessions
    const sessionIds = judgingSessions.map(session => session.id);
    
    let criteriaScores: JudgingSessionScore[] = [];
    if (sessionIds.length > 0) {
      criteriaScores = await prisma.judgingSessionScore.findMany({
        where: {
          judgingSessionId: {
            in: sessionIds
          }
        }
      });
    }
    
    // Organize data by team for CSV
    const teamMap = new Map();
    
    for (const session of judgingSessions) {
      if (!teamMap.has(session.teamId)) {
        teamMap.set(session.teamId, {
          teamId: session.teamId,
          teamName: session.teamName,
          contingentName: session.contingentName,
          averageScore: 0,
          sessions: [],
          sessionScores: {}
        });
      }
      
      const team = teamMap.get(session.teamId);
      
      // Add session level data
      team.sessions.push({
        id: session.id,
        judgeName: session.judgeName,
        judgeId: session.judgeId,
        score: session.totalScore || 0,
        comments: session.comments || ''
      });
      
      // Find all criterion scores for this session
      const sessionCriteriaScores = criteriaScores.filter(
        score => score.judgingSessionId === session.id
      );
      
      team.sessionScores[session.id] = sessionCriteriaScores;
    }
    
    // Calculate average scores
    for (const team of teamMap.values()) {
      const totalScore = team.sessions.reduce((sum: number, session: JudgingSession) => sum + session.totalScore, 0);
      team.averageScore = team.sessions.length > 0 ? totalScore / team.sessions.length : 0;
    }
    
    // Generate CSV content
    let csvContent = '';
    
    // Add header information
    csvContent += `Event: ${eventContest.event.name}\n`;
    csvContent += `Contest: ${eventContest.contest.name}\n`;
    csvContent += `Export Date: ${new Date().toISOString().split('T')[0]}\n\n`;
    
    // Basic headers for all exports
    let headers = ['Rank', 'Team Name', 'Contingent', 'Average Score'];
    
    // Add judge names as headers if we have sessions
    const judgeHeaders = judges.map(judge => `${judge.user.name} Score`);
    headers = [...headers, ...judgeHeaders];
    
    // If we have criteria from the template, add them for each judge
    let criteriaHeaders = [];
    if (judgingTemplate && judgingTemplate.judgingtemplatecriteria.length > 0) {
      for (const judge of judges) {
        for (const criterion of judgingTemplate.judgingtemplatecriteria) {
          criteriaHeaders.push(`${judge.user.name} - ${criterion.name} (${criterion.weight}%)`);
        }
      }
      headers = [...headers, ...criteriaHeaders];
    }
    
    // Add headers for comments
    const commentHeaders = judges.map(judge => `${judge.user.name} Comments`);
    headers = [...headers, ...commentHeaders];
    
    csvContent += headers.join(',') + '\n';
    
    // Sort teams by average score and add rank
    const teamResults = Array.from(teamMap.values())
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
    
    // Add rows for each team
    for (const team of teamResults) {
      let row = [
        team.rank,
        `"${team.teamName.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${team.contingentName.replace(/"/g, '""')}"`,
        team.averageScore.toFixed(2)
      ];
      
      // Add judge scores
      for (const judge of judges) {
        const judgeSession = team.sessions.find((session: TeamSession) => session.judgeId === judge.userId);
        row.push(judgeSession ? judgeSession.score.toFixed(2) : 'N/A');
      }
      
      // Add criteria scores if available
      if (judgingTemplate && judgingTemplate.judgingtemplatecriteria.length > 0) {
        for (const judge of judges) {
          const judgeSession = team.sessions.find((session: TeamSession) => session.judgeId === judge.userId);
          
          for (const criterion of judgingTemplate.judgingtemplatecriteria) {
            if (judgeSession) {
              const criterionScore = team.sessionScores[judgeSession.id]?.find(
                (score: { criterionId: number; score: number }) => score.criterionId === criterion.id
              );
              row.push(criterionScore ? criterionScore.score.toFixed(2) : 'N/A');
            } else {
              row.push('N/A');
            }
          }
        }
      }
      
      // Add comments
      for (const judge of judges) {
        const judgeSession = team.sessions.find((session: TeamSession) => session.judgeId === judge.userId);
        row.push(judgeSession && judgeSession.comments ? `"${judgeSession.comments.replace(/"/g, '""')}"` : '');
      }
      
      csvContent += row.join(',') + '\n';
    }
    
    // Create filename with event and contest info
    const filename = `${eventContest.event.name.replace(/\s+/g, '_')}_${eventContest.contest.name.replace(/\s+/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Return CSV with appropriate headers
    const responseHeaders = {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/csv',
    };
    
    return new NextResponse(csvContent, { 
      status: 200, 
      headers: responseHeaders 
    });
    
  } catch (error) {
    console.error('Error exporting judging results:', error);
    return NextResponse.json(
      { error: 'Failed to export judging results' },
      { status: 500 }
    );
  }
}
