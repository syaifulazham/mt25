import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/organizer/quizzes/[id]/questions/[questionId]
// Get a specific question in a quiz
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    if (isNaN(quizId) || isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Find the specific quiz question
    const quizQuestion = await prisma.quiz_question.findFirst({
      where: {
        quizId: quizId,
        id: questionId,
      },
      include: {
        question: true,
        quiz: {
          select: {
            quiz_name: true,
            status: true,
          },
        },
      },
    });

    if (!quizQuestion) {
      return NextResponse.json({ error: "Question not found in quiz" }, { status: 404 });
    }

    return NextResponse.json(quizQuestion);
  } catch (error) {
    console.error("[API] Error getting quiz question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/organizer/quizzes/[id]/questions/[questionId]
// Update the points or order of a specific question in a quiz
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    if (isNaN(quizId) || isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await request.json();
    if (!data.points && !data.order) {
      return NextResponse.json(
        { error: "At least one of points or order must be provided" },
        { status: 400 }
      );
    }

    // Check if quiz exists and can be edited
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.status !== "created" && quiz.status !== "retracted") {
      return NextResponse.json(
        { error: "Cannot edit questions for a published quiz" },
        { status: 400 }
      );
    }

    // Check if the quiz question exists
    const quizQuestion = await prisma.quiz_question.findFirst({
      where: {
        quizId: quizId,
        id: questionId,
      },
    });

    if (!quizQuestion) {
      return NextResponse.json({ error: "Question not found in quiz" }, { status: 404 });
    }

    // Update the quiz question
    const updatedQuizQuestion = await prisma.quiz_question.update({
      where: {
        id: questionId,
      },
      data: {
        points: data.points !== undefined ? data.points : undefined,
        order: data.order !== undefined ? data.order : undefined,
      },
    });

    return NextResponse.json(updatedQuizQuestion);
  } catch (error) {
    console.error("[API] Error updating quiz question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/organizer/quizzes/[id]/questions/[questionId]
// Remove a specific question from a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizId = parseInt(params.id);
    const questionId = parseInt(params.questionId);
    if (isNaN(quizId) || isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if quiz exists and can be edited
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.status !== "created" && quiz.status !== "retracted") {
      return NextResponse.json(
        { error: "Cannot remove questions from a published quiz" },
        { status: 400 }
      );
    }

    // Check if the quiz question exists
    const quizQuestion = await prisma.quiz_question.findFirst({
      where: {
        quizId: quizId,
        id: questionId,
      },
    });

    if (!quizQuestion) {
      return NextResponse.json({ error: "Question not found in quiz" }, { status: 404 });
    }

    // Delete the quiz question
    await prisma.quiz_question.delete({
      where: {
        id: questionId,
      },
    });

    // Reorder the remaining questions to maintain contiguous order
    const remainingQuestions = await prisma.quiz_question.findMany({
      where: {
        quizId: quizId,
      },
      orderBy: {
        order: "asc",
      },
    });

    await Promise.all(
      remainingQuestions.map(async (q, index) => {
        return prisma.quiz_question.update({
          where: {
            id: q.id,
          },
          data: {
            order: index + 1,
          },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error removing quiz question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
