import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuizAuthorization } from "../../auth-utils";

// POST /api/organizer/quizzes/[id]/publish
// Publish a quiz
export async function POST(
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
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        quiz_questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check if quiz can be published
    if (quiz.status !== "created" && quiz.status !== "retracted") {
      return NextResponse.json(
        { error: "Only quizzes in 'created' or 'retracted' state can be published" },
        { status: 400 }
      );
    }

    // Ensure quiz has questions
    if (quiz.quiz_questions.length === 0) {
      return NextResponse.json(
        { error: "Cannot publish a quiz with no questions" },
        { status: 400 }
      );
    }

    // Update quiz to published state
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(updatedQuiz);
  } catch (error) {
    console.error("[API] Error publishing quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/organizer/quizzes/[id]/publish/retract
// Retract a published quiz
export async function PATCH(
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
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check if quiz can be retracted
    if (quiz.status !== "published") {
      return NextResponse.json(
        { error: "Only published quizzes can be retracted" },
        { status: 400 }
      );
    }

    // Update quiz to retracted state
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "retracted",
      },
    });

    return NextResponse.json(updatedQuiz);
  } catch (error) {
    console.error("[API] Error retracting quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
