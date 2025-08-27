import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuizAuthorization } from "./auth-utils";

// GET /api/organizer/quizzes
// Get all quizzes with optional filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || undefined;
    const targetGroup = searchParams.get("targetGroup") || undefined;
    
    // Build filter object
    const filters: any = {
      OR: search ? [
        { quiz_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ] : undefined,
      status: status ?? undefined,
      target_group: targetGroup ?? undefined
    };
    
    // Clean up undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const quizzes = await prisma.quiz.findMany({
      where: Object.keys(filters).length > 0 ? filters : undefined,
      include: {
        quiz_questions: {
          select: {
            id: true,
            points: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data for the client
    const transformedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      quiz_name: quiz.quiz_name,
      description: quiz.description,
      target_group: quiz.target_group,
      time_limit: quiz.time_limit,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      createdBy: quiz.createdBy || 'Unknown',
      creatorName: quiz.createdBy || 'Unknown', // Use createdBy string directly
      totalQuestions: quiz.quiz_questions.length,
      totalPoints: quiz.quiz_questions.reduce((sum, q) => sum + q.points, 0)
    }));

    return NextResponse.json(transformedQuizzes);
  } catch (error) {
    console.error("[API] Error getting quizzes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/organizer/quizzes
// Create a new quiz
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const data = await request.json();

    // Validate required fields
    if (!data.quiz_name || !data.target_group) {
      return NextResponse.json(
        { error: "Required fields missing: quiz_name, target_group" },
        { status: 400 }
      );
    }

    // Log the request data
    console.log('[API] Creating quiz with data:', {
      quizName: data.quiz_name,
      targetGroup: data.target_group,
      userId: user.id,
      userName: user.name || user.email,
    });
    
    try {
      // Get creator info to store as string
      const creatorInfo = user.name || user.email || 'Admin user';
      
      // Create the quiz with createdBy as string
      const quiz = await prisma.quiz.create({
        data: {
          quiz_name: data.quiz_name,
          description: data.description || '',
          target_group: data.target_group,
          time_limit: data.time_limit ? parseInt(data.time_limit) : null,
          status: "created", // Default status is "created"
          createdBy: creatorInfo  // Use name/email as string instead of ID
        }
      });
      
      console.log(`[API] Created quiz with ID ${quiz.id}, name: ${quiz.quiz_name}`);
      
      // If there are questions to add, handle them here
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        // Process questions here if needed
      }

      return NextResponse.json(quiz, { status: 201 });
    } catch (error) {
      console.error("[API] Error in quiz creation:", error);
      return NextResponse.json({ error: `Error saving quiz: ${error}` }, { status: 500 });
    }
  } catch (error) {
    console.error("[API] Error in main try block:", error);
    return NextResponse.json({ error: `Error processing request: ${error}` }, { status: 500 });
  }
}
