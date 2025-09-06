import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuizAuthorization } from "../../auth-utils";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/organizer/quizzes/[id]/questions
// Get all questions assigned to a quiz
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

    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Get all questions assigned to this quiz with their details
    const quizQuestions = await prisma.quiz_question.findMany({
      where: { quizId: quizId },
      include: {
        question: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Get language fields using raw SQL to include the fields even if Prisma's schema doesn't have them yet
    const questionIds = quizQuestions.map(qq => qq.questionId);
    console.log('Quiz question IDs:', questionIds);
    
    // Check if the columns exist in the database
    const checkColumns = await prisma.$queryRaw`
      SHOW COLUMNS FROM question_bank WHERE Field IN ('main_lang', 'alt_lang', 'alt_question');
    ` as Array<{Field: string}>;  
    console.log('Database columns check:', checkColumns.map(c => c.Field));
    
    // Continue with the original query
    const languageFieldsQuery = await prisma.$queryRaw`
      SELECT qb.id, qb.main_lang, qb.alt_lang, qb.alt_question
      FROM question_bank qb
      WHERE qb.id IN (${questionIds.join(', ')})
    ` as Array<{id: number, main_lang: string|null, alt_lang: string|null, alt_question: string|null}>;
    
    // Create a map for quick lookup
    const languageFieldsMap = new Map();
    languageFieldsQuery.forEach(item => {
      languageFieldsMap.set(item.id, {
        main_lang: item.main_lang || 'en',
        alt_lang: item.alt_lang,
        alt_question: item.alt_question
      });
    });
    
    // Get answer options with alt_answer using raw SQL
    const altAnswersQuery = await prisma.$queryRaw`
      SELECT qb.id, qb.answer_options
      FROM question_bank qb
      WHERE qb.id IN (${questionIds.join(', ')})
    ` as Array<{id: number, answer_options: any}>;
    
    // Log the results for debugging
    console.log('Language fields:', languageFieldsQuery.length, 'records found');
    console.log('Alt answers:', altAnswersQuery.length, 'records found');
    
    // Create a map for answer options lookup
    const altAnswersMap = new Map();
    altAnswersQuery.forEach(item => {
      altAnswersMap.set(item.id, item.answer_options);
    });
    
    // Transform the data for the client
    const transformedQuestions = quizQuestions.map((qq) => {
      // Get language fields
      const langFields = languageFieldsMap.get(qq.questionId) || { 
        main_lang: 'en', 
        alt_lang: null, 
        alt_question: null 
      };
      
      // Get possibly enhanced answer options with alt_answer field
      const enhancedOptions = altAnswersMap.get(qq.questionId) || qq.question.answer_options;
      
      return {
        id: qq.id,
        quizId: qq.quizId,
        questionId: qq.questionId,
        order: qq.order,
        points: qq.points,
        question: qq.question.question,
        question_image: qq.question.question_image,
        target_group: qq.question.target_group,
        knowledge_field: qq.question.knowledge_field,
        answer_type: qq.question.answer_type,
        answer_options: enhancedOptions,
        answer_correct: qq.question.answer_correct,
        main_lang: langFields.main_lang,
        alt_lang: langFields.alt_lang,
        alt_question: langFields.alt_question,
      };
    });

    return NextResponse.json(transformedQuestions);
  } catch (error) {
    console.error("[API] Error getting quiz questions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/organizer/quizzes/[id]/questions
// Assign questions to a quiz
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

    const data = await request.json();
    if (!Array.isArray(data.questions)) {
      return NextResponse.json(
        { error: "Invalid questions array" },
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

    // Start a transaction to handle the changes atomically
    const result = await prisma.$transaction(async (tx) => {
      // Delete any existing question assignments for this quiz
      await tx.quiz_question.deleteMany({
        where: { quizId: quizId },
      });

      // Create new question assignments based on the provided array
      const quizQuestions = await Promise.all(
        data.questions.map(async (q: any, index: number) => {
          return tx.quiz_question.create({
            data: {
              quizId: quizId,
              questionId: q.questionId,
              order: index + 1, // Ensure 1-based ordering
              points: q.points || 1, // Default to 1 point if not specified
            },
          });
        })
      );

      return quizQuestions;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error assigning questions to quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/organizer/quizzes/[id]/questions
// Update question order and points in a quiz
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
    if (!Array.isArray(data.questions)) {
      return NextResponse.json(
        { error: "Invalid questions array" },
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

    // Update each quiz question with the new order and points
    const updates = await Promise.all(
      data.questions.map(async (q: any) => {
        return prisma.quiz_question.update({
          where: {
            id: q.id,
          },
          data: {
            order: q.order,
            points: q.points,
          },
        });
      })
    );

    return NextResponse.json(updates);
  } catch (error) {
    console.error("[API] Error updating quiz questions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/organizer/quizzes/[id]/questions
// Remove all questions from a quiz
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

    // Delete all question assignments for this quiz
    await prisma.quiz_question.deleteMany({
      where: { quizId: quizId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error removing quiz questions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
