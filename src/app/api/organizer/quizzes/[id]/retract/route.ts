import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// POST /api/organizer/quizzes/[id]/retract
// Retract a published quiz
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Check if user is an organizer (not a participant)
    if ((user as any).isParticipant === true) {
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
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

    // Only allow retracting quizzes in "published" state
    if (existingQuiz.status !== "published") {
      return NextResponse.json(
        { error: "Only published quizzes can be retracted" },
        { status: 400 }
      );
    }

    // Update the quiz status to retracted
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "retracted",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Quiz retracted successfully",
      quiz
    });
  } catch (error) {
    console.error("[API] Error retracting quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
