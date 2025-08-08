import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { surveyId, contestantId } = body;

    console.log('Forcing update of survey status:', { surveyId, contestantId });

    if (!surveyId || !contestantId) {
      console.error('Missing surveyId or contestantId');
      return NextResponse.json({ error: 'Missing surveyId or contestantId' }, { status: 400 });
    }

    // First, verify that this contestant actually has answers for this survey
    console.log(`Verifying answers exist for contestantId=${contestantId}, surveyId=${surveyId}`);

    const answerCount = await (prisma as any).survey_answer.count({
      where: {
        surveyId: Number(surveyId),
        contestantId: Number(contestantId)
      }
    });

    if (answerCount === 0) {
      console.log(`No answers found for contestantId=${contestantId}, surveyId=${surveyId} - will not mark as completed`);
      return NextResponse.json({ 
        status: 'not_completed', 
        message: 'No answers found for this survey',
        answerCount: 0
      });
    }

    console.log(`[FORCE UPDATE] Forcing update for survey ${surveyId}, contestant ${contestantId}`);

    // Get total questions for this survey
    const totalQuestionsResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count FROM survey_question 
      WHERE surveyId = ${surveyId}
    `;
    
    // Get total answered questions for this contestant
    const answeredQuestionsResult = await (prisma as any).$queryRaw`
      SELECT COUNT(DISTINCT questionId) as count 
      FROM survey_answer 
      WHERE surveyId = ${surveyId} AND contestantId = ${contestantId}
    `;
    
    const totalQuestions = totalQuestionsResult[0]?.count || 0;
    const answeredQuestions = answeredQuestionsResult[0]?.count || 0;
    
    // Force status to completed if all questions are answered
    const isCompleted = totalQuestions > 0 && answeredQuestions >= totalQuestions;
    
    console.log(`[FORCE UPDATE] Survey ${surveyId} for contestant ${contestantId}: ${answeredQuestions}/${totalQuestions} questions answered, completed: ${isCompleted}`);

    // Debug query to see existing answers
    const existingAnswers = await (prisma as any).survey_answer.findMany({
      where: {
        surveyId: parseInt(surveyId),
        contestantId: parseInt(contestantId)
      },
      select: {
        questionId: true,
        answer: true,
        submittedAt: true
      }
    });

    console.log(`[FORCE UPDATE] Existing answers:`, existingAnswers);

    if (isCompleted) {
      // Update or create the submission status record
      const existingStatus = await (prisma as any).survey_submission_status.findFirst({
        where: {
          surveyId: parseInt(surveyId),
          contestantId: parseInt(contestantId)
        }
      });

      if (existingStatus) {
        await (prisma as any).survey_submission_status.update({
          where: { id: existingStatus.id },
          data: { 
            status: 'completed', 
            completedAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`[FORCE UPDATE] Updated existing status record to completed`);
      } else {
        await (prisma as any).survey_submission_status.create({
          data: {
            surveyId: parseInt(surveyId),
            contestantId: parseInt(contestantId),
            status: 'completed',
            completedAt: new Date()
          }
        });
        console.log(`[FORCE UPDATE] Created new status record with completed status`);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Survey status updated to completed",
        debug: {
          surveyId,
          contestantId,
          totalQuestions,
          answeredQuestions,
          existingAnswersCount: existingAnswers.length
        }
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Survey is not complete, not updating status",
        debug: {
          surveyId,
          contestantId,
          totalQuestions,
          answeredQuestions,
          existingAnswersCount: existingAnswers.length
        }
      });
    }
  } catch (error) {
    console.error('[FORCE UPDATE] Error updating survey status:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
