import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * PATCH /api/judging/scores
 * Updates scores for judging criteria
 * Body:
 *  - scoreId: number (required)
 *  - score: number (required)
 *  - comments: string (optional)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { scoreId, score, comments } = body;
    
    if (!scoreId || score === undefined) {
      return NextResponse.json(
        { error: 'scoreId and score are required' },
        { status: 400 }
      );
    }
    
    // Find the score record
    const scoreRecord = await db.judgingSessionScore.findUnique({
      where: { id: scoreId },
      include: {
        judgingSession: true
      }
    });
    
    if (!scoreRecord) {
      return NextResponse.json(
        { error: 'Score record not found' },
        { status: 404 }
      );
    }
    
    // Verify the user is authorized to update this score
    if (
      scoreRecord.judgingSession.judgeId !== parseInt(session.user.id.toString()) && 
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'You are not authorized to update this score' },
        { status: 403 }
      );
    }
    
    // Check if judging session is still in progress
    if (scoreRecord.judgingSession.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot update scores for a completed judging session' },
        { status: 400 }
      );
    }
    
    // Update the score
    const updatedScore = await db.judgingSessionScore.update({
      where: { id: scoreId },
      data: {
        score: score,
        comments: comments !== undefined ? comments : scoreRecord.comments
      }
    });
    
    return NextResponse.json({
      score: updatedScore
    });
    
  } catch (error) {
    console.error('Error updating judging score:', error);
    return NextResponse.json(
      { error: 'Failed to update judging score' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/judging/scores/batch
 * Updates multiple scores at once
 * Body:
 *  - scores: Array<{
 *      scoreId: number,
 *      score: number,
 *      comments?: string
 *    }>
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { scores } = body;
    
    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'scores array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    // First, get the first score to check session permissions
    const firstScoreId = scores[0].scoreId;
    const firstScoreRecord = await db.judgingSessionScore.findUnique({
      where: { id: firstScoreId },
      include: {
        judgingSession: true
      }
    });
    
    if (!firstScoreRecord) {
      return NextResponse.json(
        { error: 'Score record not found' },
        { status: 404 }
      );
    }
    
    // Verify the user is authorized to update these scores
    if (
      firstScoreRecord.judgingSession.judgeId !== parseInt(session.user.id.toString()) && 
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'You are not authorized to update these scores' },
        { status: 403 }
      );
    }
    
    // Check if judging session is still in progress
    if (firstScoreRecord.judgingSession.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot update scores for a completed judging session' },
        { status: 400 }
      );
    }
    
    // Update all scores
    const updatePromises = scores.map(scoreUpdate => 
      db.judgingSessionScore.update({
        where: { id: scoreUpdate.scoreId },
        data: {
          score: scoreUpdate.score,
          comments: scoreUpdate.comments !== undefined ? scoreUpdate.comments : undefined
        }
      })
    );
    
    const updatedScores = await Promise.all(updatePromises);
    
    // Calculate the current total score based on weights
    const allSessionScores = await db.judgingSessionScore.findMany({
      where: {
        judgingSessionId: firstScoreRecord.judgingSessionId
      }
    });
    
    const calculatedTotalScore = allSessionScores.reduce((acc, score) => {
      // Convert criterion weight (0-100) to decimal (0-1) and multiply by score
      const weightedScore = (score.criterionWeight / 100) * score.score;
      return acc + weightedScore;
    }, 0);
    
    // Update the judging session with the current calculated score
    await db.judgingSession.update({
      where: { id: firstScoreRecord.judgingSessionId },
      data: {
        totalScore: calculatedTotalScore
      }
    });
    
    return NextResponse.json({
      scores: updatedScores,
      totalScore: calculatedTotalScore
    });
    
  } catch (error) {
    console.error('Error batch updating judging scores:', error);
    return NextResponse.json(
      { error: 'Failed to update judging scores' },
      { status: 500 }
    );
  }
}
