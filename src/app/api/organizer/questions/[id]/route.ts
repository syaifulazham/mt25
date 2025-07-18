import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET /api/organizer/questions/[id]
// Get a single question by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Check if user is an organizer (not a participant)
    // We need to use type assertion since the properties are added dynamically in session.ts
    if ((user as any).isParticipant === true) {
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
    }

    const questionId = parseInt(params.id);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
    }

    // Find the question with related data
    const question = await prisma.question_bank.findUnique({
      where: { id: questionId },
      include: {
        quiz_questions: {
          include: {
            quiz: {
              select: {
                id: true,
                quiz_name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Transform the response to include formatted data
    const transformedQuestion = {
      ...question,
      creatorName: question.createdBy || 'Unknown', // Use createdBy field instead of creator relation
      usedInQuizzes: question.quiz_questions.map((qq) => ({
        quizId: qq.quiz.id,
        quizName: qq.quiz.quiz_name,
        quizStatus: qq.quiz.status,
        points: qq.points,
        order: qq.order,
      })),
    };

    return NextResponse.json(transformedQuestion);
  } catch (error) {
    console.error("[API] Error getting question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/organizer/questions/[id]
// Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Check if user is an organizer (not a participant)
    // We need to use type assertion since the properties are added dynamically in session.ts
    if ((user as any).isParticipant === true) {
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
    }

    const questionId = parseInt(params.id);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.question || !data.target_group || !data.knowledge_field || !data.answer_type || !data.answer_options || !data.answer_correct) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    // Check if question exists
    const existingQuestion = await prisma.question_bank.findUnique({
      where: { id: questionId },
      include: {
        quiz_questions: {
          include: {
            quiz: true,
          },
        },
      },
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if this question is used in any published quizzes
    const usedInPublishedQuiz = existingQuestion.quiz_questions.some(
      (qq) => qq.quiz.status === "published"
    );

    if (usedInPublishedQuiz) {
      return NextResponse.json(
        { error: "Cannot edit a question used in a published quiz" },
        { status: 400 }
      );
    }

    // Validate that the correct answer exists in the options
    if (data.answer_type === "multiple_selection") {
      const correctAnswers = data.answer_correct.split(',');
      const optionKeys = data.answer_options.map((opt: any) => opt.option);
      const isValid = correctAnswers.every((ans: string) => optionKeys.includes(ans));
      
      if (!isValid) {
        return NextResponse.json(
          { error: "Correct answers must all exist in the options" },
          { status: 400 }
        );
      }
    } else {
      // For single_selection and binary
      const optionKeys = data.answer_options.map((opt: any) => opt.option);
      if (!optionKeys.includes(data.answer_correct)) {
        return NextResponse.json(
          { error: "Correct answer must exist in the options" },
          { status: 400 }
        );
      }
    }

    // Update the question
    const question = await prisma.question_bank.update({
      where: { id: questionId },
      data: {
        question: data.question,
        question_image: data.question_image,
        target_group: data.target_group,
        knowledge_field: data.knowledge_field,
        answer_type: data.answer_type,
        answer_options: data.answer_options,
        answer_correct: data.answer_correct,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("[API] Error updating question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/organizer/questions/[id]
// Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Check if user is an organizer (not a participant)
    // We need to use type assertion since the properties are added dynamically in session.ts
    if ((user as any).isParticipant === true) {
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
    }

    const questionId = parseInt(params.id);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
    }

    // Check if question exists and if it's used in any published quizzes
    const existingQuestion = await prisma.question_bank.findUnique({
      where: { id: questionId },
      include: {
        quiz_questions: {
          include: {
            quiz: true,
          },
        },
      },
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if this question is used in any published quizzes
    const usedInPublishedQuiz = existingQuestion.quiz_questions.some(
      (qq) => qq.quiz.status === "published"
    );

    if (usedInPublishedQuiz) {
      return NextResponse.json(
        { error: "Cannot delete a question used in a published quiz" },
        { status: 400 }
      );
    }

    // If the question is used in non-published quizzes, remove those associations first
    if (existingQuestion.quiz_questions.length > 0) {
      await prisma.quiz_question.deleteMany({
        where: { questionId: questionId },
      });
    }

    // Delete the question
    await prisma.question_bank.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
