import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getToken } from "next-auth/jwt";

// GET /api/participant/quizzes/[id]
// Get a specific quiz by ID with its questions for a contestant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get contestant hashcode from query params
    const contestantHashcode = request.nextUrl.searchParams.get('hashcode');
    
    if (!contestantHashcode) {
      return NextResponse.json({ error: "Contestant hashcode is required" }, { status: 400 });
    }
    
    // Verify contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { hashcode: contestantHashcode },
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Invalid contestant credentials" }, { status: 401 });
    }
    
    // Verify the session is valid (participant/contingent manager)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    
    // Get session token to check if it's an admin/organizer
    const token = await getToken({ req: request });
    if (token?.userType === "organizer") {
      return NextResponse.json({ error: "Access denied. Organizers cannot access contestant endpoints." }, { status: 403 });
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    // Check if quiz exists and is published
    const quiz = await prisma.quiz.findUnique({
      where: { 
        id: quizId,
        status: "published" // Only published quizzes are accessible
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        quiz_questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found or not available" }, { status: 404 });
    }

    // Check if contestant has already taken this quiz
    const existingAttempt = await prisma.quiz_attempt.findFirst({
      where: {
        quizId: quizId,
        contestantId: contestant.id,
        status: "completed"
      }
    });

    if (existingAttempt) {
      // Return the attempt data and notify that quiz was already taken
      return NextResponse.json({ 
        error: "You have already completed this quiz",
        attemptId: existingAttempt.id
      }, { status: 403 });
    }

    // Transform the response to include formatted data and remove the correct answers
    const transformedQuiz = {
      id: quiz.id,
      quiz_name: quiz.quiz_name,
      description: quiz.description,
      target_group: quiz.target_group,
      time_limit: quiz.time_limit,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      createdBy: quiz.createdBy,
      creatorName: quiz.creator.name,
      totalQuestions: quiz.quiz_questions.length,
      totalPoints: quiz.quiz_questions.reduce((sum, q) => sum + q.points, 0),
      questions: quiz.quiz_questions.map((qq) => ({
        id: qq.id,
        questionId: qq.questionId,
        question: qq.question.question,
        question_image: qq.question.question_image,
        answer_type: qq.question.answer_type,
        answer_options: qq.question.answer_options,
        order: qq.order,
        points: qq.points,
        // Note: We don't include the correct answers here to prevent cheating
      })),
    };

    // Create a new attempt record to track this quiz attempt
    const attempt = await prisma.quiz_attempt.create({
      data: {
        quizId: quizId,
        contestantId: contestant.id,
        status: "started",
        start_time: new Date(),
      }
    });

    return NextResponse.json({
      ...transformedQuiz,
      attemptId: attempt.id
    });
  } catch (error) {
    console.error("[API] Error getting quiz for participant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
