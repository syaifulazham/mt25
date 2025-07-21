import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// Define interface for score updates
interface ScoreUpdate {
  scoreId: number;
  score: number;
  comments?: string;
  selectedDiscreteText?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  totalTime?: number;
}

/**
 * POST /api/judge/scores
 * Batch updates scores for judge session criteria
 * Body:
 *  - hashcode: string (required)
 *  - scores: ScoreUpdate[] (required)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hashcode, scores } = body;

    if (!hashcode || !scores || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'hashcode and scores array are required' },
        { status: 400 }
      );
    }

    console.log(`Validating judge with hashcode: ${hashcode}`);
    
    // First, find the judge endpoint with the given hashcode
    const judgeEndpoint = await prisma.judges_endpoints.findFirst({
      where: { hashcode },
      include: {
        event: true,
        contest: true
      }
    });

    if (!judgeEndpoint) {
      console.error(`Judge endpoint not found for hashcode: ${hashcode}`);
      return NextResponse.json(
        { error: 'Invalid judge hashcode' },
        { status: 401 }
      );
    }
    
    console.log(`Found judge endpoint: ${judgeEndpoint.id} (${judgeEndpoint.judge_name}) for event ${judgeEndpoint.eventId} contest ${judgeEndpoint.contestId}`);
    
    // Process each score update
    const updatePromises = scores.map(async (scoreUpdate: ScoreUpdate) => {
      const { scoreId } = scoreUpdate;

      // Find the score record
      const scoreRecord = await prisma.judgingSessionScore.findUnique({
        where: { id: scoreId },
        include: {
          judgingSession: {
            include: {
              eventcontest: true
            }
          }
        }
      });

      if (!scoreRecord) {
        throw new Error(`Score record not found: ${scoreId}`);
      }

      // Verify this score belongs to the judge's contest/event
      const eventcontestInfo = scoreRecord.judgingSession.eventcontest;
      if (
        eventcontestInfo.eventId !== judgeEndpoint.eventId ||
        eventcontestInfo.contestId !== judgeEndpoint.contestId
      ) {
        console.error(`Score ${scoreId} does not belong to this judge's contest/event`);
        throw new Error(`Unauthorized: Score ${scoreId} does not belong to this judge's contest/event`);
      }

      // Check if judging session is still in progress
      if (scoreRecord.judgingSession.status !== 'IN_PROGRESS') {
        throw new Error(`Cannot update scores for a completed judging session`);
      }

      // Prepare update data based on criterion type
      const updateData: any = {
        score: scoreUpdate.score,
      };

      // Add comments if provided
      if (scoreUpdate.comments !== undefined) {
        updateData.comments = scoreUpdate.comments;
      }

      // Add selectedDiscreteText if provided (for DISCRETE criteria)
      if (scoreUpdate.selectedDiscreteText !== undefined) {
        updateData.selectedDiscreteText = scoreUpdate.selectedDiscreteText;
      }

      // Add time-related fields if provided (for TIME criteria)
      if (scoreUpdate.startTime !== undefined) {
        updateData.startTime = scoreUpdate.startTime;
      }

      if (scoreUpdate.endTime !== undefined) {
        updateData.endTime = scoreUpdate.endTime;
      }

      if (scoreUpdate.totalTime !== undefined) {
        updateData.totalTime = scoreUpdate.totalTime;
      }

      // Update the score
      console.log(`Updating score ${scoreId} with data:`, updateData);
      return prisma.judgingSessionScore.update({
        where: { id: scoreId },
        data: updateData
      });
    });

    // Execute all updates in parallel
    try {
      const results = await Promise.all(updatePromises);
      console.log(`Successfully updated ${results.length} scores`);
      
      // Get the first score to extract the judgingSessionId
      if (results.length > 0) {
        const firstScore = results[0];
        const sessionId = firstScore.judgingSessionId;
        
        // Calculate the total score for this session
        const allSessionScores = await prisma.judgingSessionScore.findMany({
          where: { judgingSessionId: sessionId }
        });
        
        // Sum all scores
        const totalScore = allSessionScores.reduce((sum, score) => {
          const scoreValue = score.score ? parseFloat(score.score.toString()) : 0;
          return sum + scoreValue;
        }, 0);
        
        console.log(`Calculated total score for session ${sessionId}: ${totalScore}`);
        
        // Update the judgingSession totalScore
        await prisma.judgingSession.update({
          where: { id: sessionId },
          data: { totalScore }
        });
        
        console.log(`Updated judgingSession ${sessionId} with totalScore: ${totalScore}`);
      }
    } catch (error) {
      console.error('Error during batch score update:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to update scores' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scores updated successfully'
    });

  } catch (error) {
    console.error('Error updating judge scores:', error);
    return NextResponse.json(
      { error: 'Failed to update judge scores' },
      { status: 500 }
    );
  }
}
