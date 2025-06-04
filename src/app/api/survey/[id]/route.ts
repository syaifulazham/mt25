import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

const prisma = new PrismaClient();

interface SurveyQuestion {
  id: number;
  surveyId: number;
  question: string;
  questionType: string;
  options: any | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SurveyResult {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number; // For top-level count
  contestantCount: number; // For top-level count
  answerCount: number; // For top-level count
  questions: SurveyQuestion[];
  contestantsComposition: any[];
  _count: {
    questions: number;
    contestantsComposition: number;
    answers: number;
  };
}

// GET /api/survey/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get survey details
    const [surveyResult] = await prisma.$queryRaw<any[]>`
      SELECT 
        s.id, 
        s.name, 
        s.description, 
        s.createdAt, 
        s.updatedAt,
        COUNT(DISTINCT sq.id) as questionCount,
        COUNT(DISTINCT scc.contestantId) as contestantCount,
        COUNT(DISTINCT sa.id) as answerCount
      FROM survey s
      LEFT JOIN survey_question sq ON s.id = sq.surveyId
      LEFT JOIN survey_contestants_composition scc ON s.id = scc.surveyId
      LEFT JOIN survey_answer sa ON s.id = sa.surveyId
      WHERE s.id = ${id}
      GROUP BY s.id
    `;

    if (!surveyResult) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Get survey questions
    const questions = await prisma.$queryRaw<SurveyQuestion[]>`
      SELECT id, surveyId, question, questionType, options, displayOrder, createdAt, updatedAt
      FROM survey_question
      WHERE surveyId = ${id}
      ORDER BY displayOrder ASC, id ASC
    `;

    // Get contestant assignments
    const contestantsComposition = await prisma.$queryRaw<any[]>`
      SELECT 
        scc.id, 
        scc.surveyId, 
        scc.contestantId,
        c.name AS contestantName,
        c.email AS contestantEmail
      FROM survey_contestants_composition scc
      JOIN contestant c ON scc.contestantId = c.id
      WHERE scc.surveyId = ${id}
    `;

    const survey: SurveyResult = {
      id: surveyResult.id,
      name: surveyResult.name,
      description: surveyResult.description,
      createdAt: surveyResult.createdAt,
      updatedAt: surveyResult.updatedAt,
      questionCount: Number(surveyResult.questionCount),
      contestantCount: Number(surveyResult.contestantCount),
      answerCount: Number(surveyResult.answerCount),
      questions,
      contestantsComposition,
      _count: {
        questions: Number(surveyResult.questionCount),
        contestantsComposition: Number(surveyResult.contestantCount),
        answers: Number(surveyResult.answerCount)
      }
    };

    return NextResponse.json(survey);
  } catch (error) {
    console.error(`Error fetching survey ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch survey" },
      { status: 500 }
    );
  }
}

// PUT /api/survey/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Survey name is required" },
        { status: 400 }
      );
    }

    // Check if the survey exists
    const [existingSurvey] = await prisma.$queryRaw<any[]>`
      SELECT id FROM survey WHERE id = ${id}
    `;

    if (!existingSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Check existing questions to determine which to update, delete, or create
    const existingQuestions = await prisma.$queryRaw<SurveyQuestion[]>`
      SELECT id, surveyId, question, questionType, options, displayOrder, createdAt, updatedAt FROM survey_question WHERE surveyId = ${id}
    `;

    const existingQuestionIds = new Set(existingQuestions.map((q) => Number(q.id)));
    const updatedQuestionIds = new Set(
      data.questions
        .filter((q: any) => q.id)
        .map((q: any) => Number(q.id))
    );

    // Find questions to delete (in DB but not in updated data)
    const questionsToDelete = Array.from(existingQuestionIds).filter(
      (qId) => !updatedQuestionIds.has(qId)
    );

    const now = new Date();

    // Update the survey and handle questions in a transaction
    const updatedSurvey = await prisma.$transaction(async (tx) => {
      // Update the survey
      await tx.$executeRaw`
        UPDATE survey
        SET name = ${data.name}, description = ${data.description || null}, updatedAt = ${now}
        WHERE id = ${id}
      `;

      // Delete questions that are no longer needed
      if (questionsToDelete.length > 0) {
        for (const qId of questionsToDelete) {
          await tx.$executeRaw`
            DELETE FROM survey_question WHERE id = ${qId}
          `;
        }
      }

      // Update existing questions and create new ones
      for (const question of data.questions) {
        if (question.id && existingQuestionIds.has(Number(question.id))) {
          // Update existing question
          // Serialize options to JSON string if present
          const serializedOptions = question.options ? JSON.stringify(question.options) : null;
          
          await tx.$executeRaw`
            UPDATE survey_question
            SET question = ${question.question}, 
                questionType = ${question.questionType || 'text'}, 
                options = ${serializedOptions}, 
                displayOrder = ${question.displayOrder || 0}, 
                updatedAt = ${now}
            WHERE id = ${question.id}
          `;
        } else if (!question.id && question.question && question.question.trim()) {
          // Create new question
          // Serialize options to JSON string if present
          const serializedOptions = question.options ? JSON.stringify(question.options) : null;
          
          await tx.$executeRaw`
            INSERT INTO survey_question (surveyId, question, questionType, options, displayOrder, createdAt, updatedAt)
            VALUES (${id}, ${question.question}, ${question.questionType || 'text'}, ${serializedOptions}, ${question.displayOrder || 0}, ${now}, ${now})
          `;
        }
      }

      // Fetch updated survey
      const [surveyResult] = await tx.$queryRaw<any[]>`
        SELECT id, name, description, createdAt, updatedAt
        FROM survey WHERE id = ${id}
      `;
      
      // Fetch updated questions
      const updatedQuestions = await tx.$queryRaw<SurveyQuestion[]>`
        SELECT id, surveyId, question, questionType, options, displayOrder, createdAt, updatedAt
        FROM survey_question
        WHERE surveyId = ${id}
        ORDER BY displayOrder ASC, id ASC
      `;

      return {
        ...surveyResult,
        questions: updatedQuestions
      };
    });

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error(`Error updating survey ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

// DELETE /api/survey/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if the survey exists
    const [existingSurvey] = await prisma.$queryRaw<any[]>`
      SELECT id FROM survey WHERE id = ${id}
    `;

    if (!existingSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Use a transaction to delete the survey and related data
    await prisma.$transaction(async (tx) => {
      // Delete answers first (foreign key constraint)
      await tx.$executeRaw`
        DELETE FROM survey_answer WHERE surveyId = ${id}
      `;
      
      // Delete contestant assignments
      await tx.$executeRaw`
        DELETE FROM survey_contestants_composition WHERE surveyId = ${id}
      `;
      
      // Delete survey questions
      await tx.$executeRaw`
        DELETE FROM survey_question WHERE surveyId = ${id}
      `;
      
      // Delete the survey itself
      await tx.$executeRaw`
        DELETE FROM survey WHERE id = ${id}
      `;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting survey ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
