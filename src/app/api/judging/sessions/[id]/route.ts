import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/judging/sessions/[id]
 * Retrieves a specific judging session with all scores
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Get the judging session with scores
    const judgingSession = await prisma.judgingSession.findUnique({
      where: { id },
      include: {
        judgingSessionScore: {
          orderBy: {
            criterionId: 'asc'
          }
        }
      }
    });
    
    // Get associated event contest and template info
    let eventContestWithTemplate = null;
    if (judgingSession) {
      eventContestWithTemplate = await prisma.eventcontest.findUnique({
        where: { id: judgingSession.eventContestId },
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
    
    if (judgingSession && judgingSession.judgingSessionScore.length > 0 && templateId) {
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
      
      console.log('Template criteria fetched:', JSON.stringify(templateCriteria));
      
      // Create a map for quick lookup
      const criteriaMap = new Map();
      templateCriteria.forEach(criteria => {
        criteriaMap.set(criteria.id, criteria);
      });
      
      // Create an array of criteria in the same order as template
      const sortedTemplateCriteria = templateCriteria.sort((a, b) => a.id - b.id);
      console.log('Sorted template criteria:', JSON.stringify(sortedTemplateCriteria));
      
      // Sort session scores by criterionId to maintain proper order
      const sortedScores = [...judgingSession.judgingSessionScore].sort(
        (a, b) => a.criterionId - b.criterionId
      );
      
      // Map session scores to template criteria by their position/index
      criteriaWithDetails = sortedScores.map((score, index) => {
        // Find matching template criterion by name or just use index if name match fails
        const matchingCriterion = sortedTemplateCriteria.find(
          c => c.name.toLowerCase() === score.criterionName.toLowerCase()
        ) || sortedTemplateCriteria[index] || null;
        
        console.log(`Mapping score criterionId=${score.criterionId} name=${score.criterionName} to template criterion:`, 
          matchingCriterion ? JSON.stringify(matchingCriterion) : 'null');
        
        // Create a new object with the score properties plus details from template
        return {
          ...score,
          criterionType: matchingCriterion?.evaluationType || score.criterionType,
          // For DISCRETE types, check both the score type and the template type
          discreteValues: (
            score.criterionType === 'DISCRETE' || 
            score.criterionType === 'DISCRETE_SINGLE' || 
            score.criterionType === 'DISCRETE_MULTIPLE' ||
            matchingCriterion?.evaluationType === 'DISCRETE' ||
            matchingCriterion?.evaluationType === 'DISCRETE_SINGLE' ||
            matchingCriterion?.evaluationType === 'DISCRETE_MULTIPLE'
          ) ? matchingCriterion?.discreteValues : null
        };
      });
      
      console.log('Enhanced criteria with details:', JSON.stringify(criteriaWithDetails));
    }
    
    if (!judgingSession) {
      return NextResponse.json(
        { error: 'Judging session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to access this session
    if (judgingSession.judgeId !== parseInt(session.user.id.toString()) && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to access this judging session' },
        { status: 403 }
      );
    }
    
    // Get team and contest details
    const attendanceTeam = await prisma.attendanceTeam.findUnique({
      where: { Id: judgingSession.attendanceTeamId }
    });
    
    const team = attendanceTeam ? await prisma.team.findUnique({
      where: { id: attendanceTeam.teamId }
    }) : null;
    
    const contingent = attendanceTeam ? await prisma.contingent.findUnique({
      where: { id: attendanceTeam.contingentId }
    }) : null;
    
    // We already fetched eventContestWithTemplate earlier
    
    // Replace judgingSessionScore with our enhanced version
    if (judgingSession && criteriaWithDetails.length > 0) {
      judgingSession.judgingSessionScore = criteriaWithDetails;
    }
    
    return NextResponse.json({
      judgingSession,
      team,
      contingent,
      eventContest: eventContestWithTemplate
    });
    
  } catch (error) {
    console.error('Error retrieving judging session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve judging session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/judging/sessions/[id]
 * Updates a judging session (completing it, adding comments)
 * Body:
 *  - status: 'IN_PROGRESS' | 'COMPLETED' (optional)
 *  - comments: string (optional)
 *  - totalScore: number (calculated, optional)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { status, comments, totalScore } = body;
    
    // Get the current judging session
    const judgingSession = await prisma.judgingSession.findUnique({
      where: { id },
      include: {
        judgingSessionScore: true
      }
    });
    
    if (!judgingSession) {
      return NextResponse.json(
        { error: 'Judging session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to update this session
    if (judgingSession.judgeId !== parseInt(session.user.id.toString()) && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to update this judging session' },
        { status: 403 }
      );
    }
    
    // If completing the session, ensure all criteria have scores
    if (status === 'COMPLETED') {
      const hasEmptyScores = judgingSession.judgingSessionScore.some(score => score.score === null);
      if (hasEmptyScores) {
        return NextResponse.json(
          { error: 'All criteria must have scores before completing the judging session' },
          { status: 400 }
        );
      }
    }
    
    // Calculate total score from individual criteria scores
    let calculatedTotalScore = 0;
    console.log('=== TOTALSCORE CALCULATION DEBUG ===');
    console.log('All scores:', judgingSession.judgingSessionScore?.map(s => ({ id: s.id, score: s.score, type: typeof s.score })));
    
    if (judgingSession.judgingSessionScore && judgingSession.judgingSessionScore.length > 0) {
      const validScores = judgingSession.judgingSessionScore.filter((score: any) => score.score !== null);
      console.log('Valid scores:', validScores.map(s => ({ id: s.id, score: s.score, type: typeof s.score })));
      
      if (validScores.length > 0) {
        calculatedTotalScore = validScores.reduce((acc: number, score: any) => {
          // Properly convert Decimal objects to numbers
          let scoreValue: number;
          if (typeof score.score === 'string') {
            scoreValue = parseFloat(score.score);
          } else if (typeof score.score === 'number') {
            scoreValue = score.score;
          } else if (score.score && typeof score.score === 'object') {
            // Handle Prisma Decimal objects
            scoreValue = parseFloat(score.score.toString());
          } else {
            scoreValue = 0;
          }
          
          // Ensure we have a valid number
          scoreValue = isNaN(scoreValue) ? 0 : scoreValue;
          
          console.log(`Processing score ID ${score.id}: ${score.score} (${typeof score.score}) -> ${scoreValue}, acc: ${acc} -> ${acc + scoreValue}`);
          return acc + scoreValue;
        }, 0);
      }
    }
    console.log('Final calculatedTotalScore:', calculatedTotalScore);
    console.log('=== END DEBUG ===');
    
    // Ensure calculatedTotalScore is a valid number and within DECIMAL(10,2) range
    calculatedTotalScore = isNaN(calculatedTotalScore) ? 0 : calculatedTotalScore;
    
    // Ensure totalScore is within DECIMAL(10,2) range (max: 99999999.99)
    const maxDecimalValue = 99999999.99;
    if (calculatedTotalScore > maxDecimalValue) {
      console.warn(`TotalScore ${calculatedTotalScore} exceeds DECIMAL(10,2) limit, capping at ${maxDecimalValue}`);
      calculatedTotalScore = maxDecimalValue;
    }
    if (calculatedTotalScore < -maxDecimalValue) {
      console.warn(`TotalScore ${calculatedTotalScore} below DECIMAL(10,2) limit, capping at ${-maxDecimalValue}`);
      calculatedTotalScore = -maxDecimalValue;
    }
    
    // Debug logging
    console.log('Debug totalScore calculation:', {
      requestTotalScore: totalScore,
      calculatedTotalScore,
      finalTotalScore: calculatedTotalScore !== undefined ? calculatedTotalScore : judgingSession.totalScore,
      scoresData: judgingSession.judgingSessionScore.map(s => ({ id: s.id, score: s.score, type: typeof s.score }))
    });
    
    // Update the judging session
    const updatedSession = await prisma.judgingSession.update({
      where: { id },
      data: {
        status: status || judgingSession.status,
        comments: comments !== undefined ? comments : judgingSession.comments,
        totalScore: calculatedTotalScore, // Always use calculated score from database
        endTime: status === 'COMPLETED' ? new Date() : judgingSession.endTime
      },
      include: {
        judgingSessionScore: true
      }
    });
    
    return NextResponse.json({
      judgingSession: updatedSession
    });
    
  } catch (error) {
    console.error('Error updating judging session:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: params.id
    });
    return NextResponse.json(
      { error: 'Failed to update judging session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/judging/sessions/[id]
 * Deletes a judging session (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete judging sessions.' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Delete the judging session (cascades to scores)
    await prisma.judgingSession.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: 'Judging session deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting judging session:', error);
    return NextResponse.json(
      { error: 'Failed to delete judging session' },
      { status: 500 }
    );
  }
}
