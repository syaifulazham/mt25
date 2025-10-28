import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuizAuthorization } from "../auth-utils";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET /api/organizer/quizzes/[id]
// Get a single quiz by ID with its questions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
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
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Transform the response to include formatted data
    const transformedQuiz = {
      id: quiz.id,
      quiz_name: quiz.quiz_name,
      description: quiz.description,
      target_group: quiz.target_group,
      createdBy: quiz.createdBy,
      time_limit: quiz.time_limit,
      status: quiz.status,
      publishedAt: quiz.publishedAt,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      nextQuizId: quiz.nextQuizId,
      creatorName: quiz.createdBy || 'Quiz Administrator',
      totalQuestions: quiz.quiz_questions.length,
      totalPoints: quiz.quiz_questions.reduce((sum, q) => sum + q.points, 0),
      questions: quiz.quiz_questions.map((qq) => ({
        id: qq.question.id,
        questionId: qq.questionId,
        question: qq.question.question,
        question_image: qq.question.question_image,
        answer_type: qq.question.answer_type,
        answer_options: qq.question.answer_options,
        knowledge_field: qq.question.knowledge_field,
        target_group: qq.question.target_group,
        order: qq.order,
        points: qq.points,
      })),
    };

    return NextResponse.json(transformedQuiz);
  } catch (error) {
    console.error("[API] Error getting quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/organizer/quizzes/[id]
// Update a quiz
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.quiz_name || !data.target_group) {
      return NextResponse.json(
        { error: "Required fields missing: quiz_name, target_group" },
        { status: 400 }
      );
    }

    // Check if quiz exists and is editable (not published)
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Only allow editing of quizzes in "created" state
    if (existingQuiz.status !== "created" && data.status !== "retracted") {
      return NextResponse.json(
        { error: "Quiz cannot be edited in its current state" },
        { status: 400 }
      );
    }

    // Update the quiz
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        quiz_name: data.quiz_name,
        description: data.description,
        target_group: data.target_group,
        time_limit: data.time_limit ? parseInt(data.time_limit) : null,
        status: data.status || existingQuiz.status,
      },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[API] Error updating quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/organizer/quizzes/[id]
// Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Only allow deletion of quizzes in "created" or "retracted" state
    if (existingQuiz.status !== "created" && existingQuiz.status !== "retracted") {
      return NextResponse.json(
        { error: "Published or completed quizzes cannot be deleted" },
        { status: 400 }
      );
    }

    // Delete the quiz (this will cascade delete the quiz_questions)
    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
