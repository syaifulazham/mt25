import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

interface SurveyQuestion {
  id: number;
  surveyId: number;
  question: string;
  questionType: string;
  options: any;
  displayOrder: number;
}

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { surveyId, contestantId, answers } = body;

    // Validate required fields
    if (!surveyId || !contestantId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the survey exists
    const survey = await (prisma as any).survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found" },
        { status: 404 }
      );
    }

    // Check if contestant exists
    const contestant = await (prisma as any).contestant.findUnique({
      where: { id: contestantId },
    });

    if (!contestant) {
      return NextResponse.json(
        { error: "Contestant not found" },
        { status: 404 }
      );
    }

    // Get survey questions for validation
    const questions = await (prisma as any).survey_question.findMany({
      where: { surveyId },
    }) as SurveyQuestion[];

    // Process each answer
    const answersArray = [];
    for (const [questionIdStr, value] of Object.entries(answers)) {
      const questionId = parseInt(questionIdStr, 10);
      
      // Find the question
      const question = questions.find((q: SurveyQuestion) => q.id === questionId);
      if (!question) {
        continue; // Skip invalid questions
      }

      try {
        // Delete any existing answers for this combination first
        await (prisma as any).survey_answer.deleteMany({
          where: {
            surveyId,
            questionId,
            contestantId
          }
        });

        // Create new answer - store value as Json
        const answer = await (prisma as any).survey_answer.create({
          data: {
            surveyId,
            questionId,
            contestantId,
            // Convert value to appropriate format for Json field
            answer: question.questionType === 'multiple_choice' && Array.isArray(value) 
              ? value  // Arrays can be stored directly as Json
              : value   // Strings and other values also work with Json type
          }
        });

        answersArray.push(answer);
      } catch (err) {
        console.error(`Error saving answer for question ${questionId}:`, err);
      }
    }

    // Update submission status if we have a complete submission
    try {
      if (answersArray.length > 0) {
        // Check if we have all questions answered to mark as completed
        // Get total question count for this survey
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
        
        // Determine status
        const isCompleted = totalQuestions > 0 && answeredQuestions >= totalQuestions;
        const status = isCompleted ? 'completed' : 'partial';
        
        console.log(`Survey ${surveyId} for contestant ${contestantId}: ${answeredQuestions}/${totalQuestions} questions answered, status: ${status}`);
        
        // Check if we have a status record already
        const existingStatus = await (prisma as any).survey_submission_status.findFirst({
          where: {
            surveyId,
            contestantId
          }
        });

        if (existingStatus) {
          await (prisma as any).survey_submission_status.update({
            where: { id: existingStatus.id },
            data: { 
              status,
              updatedAt: new Date(),
              // Only update completedAt if newly completed
              ...(status === 'completed' && existingStatus.status !== 'completed' ? { completedAt: new Date() } : {})
            }
          });
        } else {
          await (prisma as any).survey_submission_status.create({
            data: {
              surveyId,
              contestantId,
              status,
              completedAt: status === 'completed' ? new Date() : null
            }
          });
        }
      }
    } catch (statusErr) {
      console.error('Error updating submission status:', statusErr);
      // Continue anyway - we've already saved the answers
    }

    return NextResponse.json({ 
      success: true,
      message: "Survey answers submitted successfully",
      answersCount: answersArray.length
    });
  } catch (error) {
    console.error("Error submitting survey answers:", error);
    return NextResponse.json(
      { error: "Failed to submit survey answers" },
      { status: 500 }
    );
  }
}
