import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getToken } from "next-auth/jwt";

// GET /api/participant/quizzes
// Get all published quizzes available for contestants
export async function GET(request: NextRequest) {
  try {
    // Get contestant hashcode from query params (required for contestant identification)
    const contestantHashcode = request.nextUrl.searchParams.get('hashcode');
    
    if (!contestantHashcode) {
      return NextResponse.json({ error: "Contestant hashcode is required" }, { status: 400 });
    }
    
    // Verify contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { hashcode: contestantHashcode },
      include: {
        contingent: true,
        contests: {
          include: {
            contest: true
          }
        }
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Invalid contestant credentials" }, { status: 401 });
    }
    
    // Verify the user session is valid (participant/contingent manager)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    
    // Get session token to check if it's an admin/organizer
    const token = await getToken({ req: request });
    if (token?.userType === "organizer") {
      return NextResponse.json({ error: "Access denied. Organizers cannot access contestant endpoints." }, { status: 403 });
    }

    // Get all published quizzes appropriate for this contestant
    // Filter quizzes by target_group to match contestant's edu_level
    const quizzes = await prisma.quiz.findMany({
      where: {
        status: "published",
        target_group: {
          // Match quiz target group with contestant's education level
          equals: contestant.edu_level
        }
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        quiz_questions: {
          select: {
            id: true,
            points: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Check if contestant has already taken each quiz
    const quizAttempts = await prisma.quiz_attempt.findMany({
      where: {
        contestantId: contestant.id,
        status: "completed"
      }
    });

    const completedQuizIds = new Set(quizAttempts.map(attempt => attempt.quizId));

    // Transform the data for the client
    const transformedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      quiz_name: quiz.quiz_name,
      description: quiz.description,
      target_group: quiz.target_group,
      time_limit: quiz.time_limit,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      totalQuestions: quiz.quiz_questions.length,
      totalPoints: quiz.quiz_questions.reduce((sum, q) => sum + q.points, 0),
      creatorName: quiz.creator.name,
      completed: completedQuizIds.has(quiz.id)
    }));

    return NextResponse.json(transformedQuizzes);
  } catch (error) {
    console.error("[API] Error getting quizzes for participant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
